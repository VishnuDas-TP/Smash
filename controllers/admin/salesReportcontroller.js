const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema")
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


const getSaleReport = async (req, res) => {
    try {
        const { page = 1, limit = 10, startDate, endDate } = req.query;
        console.log(req.query);
        const filter = {};

        if (startDate || endDate) {
            filter.createdOn = {};
            if (startDate) filter.createdOn.$gte = new Date(startDate);
            if (endDate) filter.createsOn.$lte = new Date(endDate)
        }

        const orders = await Order.find({ ...filter, orderStatus: { $nin: ["Returned", "Cancelled"] } }).populate('userId').populate('orderItems.product').sort({ createdOn: -1 }).skip((page - 1) * limit).limit(parseInt(limit))


        const totalSales = await Order.aggregate([{ $match: { ...filter, orderStatus: { $nin: ["Returned", "Cancelled"] } } }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]);
        const totalDiscount = await Order.aggregate([{ $match: { ...filter, orderStatus: { $nin: ["Returned", "Cancelled"] } } }, { $group: { _id: null, total: { $sum: '$discount' } } }]);
        const uniqueCustomers = await Order.distinct('userId', filter);
        const totalOrders = await Order.countDocuments({ ...filter, orderStatus: { $nin: ["Returned", "Cancelled"] } });
        console.log(orders.length);

        if (startDate || endDate) {
            // console.log('sdisahlihAOIFUa');
            res.status(200).json({
                orders,
                totalSales: totalSales[0]?.total || 0,
                totalDiscount: totalDiscount[0]?.total || 0,
                uniqueCustomers: uniqueCustomers.length,
                count: totalOrders,
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalOrders / limit),
                limit: parseInt(limit)
            })
        }
        res.render('salesReport', {
            orders,
            totalSales: totalSales[0]?.total || 0,
            totalDiscount: totalDiscount[0]?.total || 0,
            uniqueCustomers: uniqueCustomers.length,
            count: totalOrders,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalOrders / limit),
            limit: parseInt(limit)
        })

    } catch (error) {
        console.error(error);

    }
}
const pdfGenerate = async (req, res) => {
    try {
        const { start, end } = req.query;
        console.log("Query parameters:", req.query);

        const filter = {};

        if (start || end) {
            filter.createdOn = {};

            if (start) {
                // Set time to beginning of day (00:00:00)
                const startDate = new Date(start);
                startDate.setHours(0, 0, 0, 0);
                filter.createdOn.$gte = startDate;
                console.log("Start date:", startDate);
            }

            if (end) {
                // Set time to end of day (23:59:59)
                const endDate = new Date(end);
                endDate.setHours(23, 59, 59, 999);
                filter.createdOn.$lte = endDate;
                console.log("End date:", endDate);
            }
        }

        console.log("Filter being applied:", JSON.stringify(filter));

        const orders = await Order.find({ ...filter, orderStatus: { $nin: ["Returned", "Cancelled"] } })
            .populate('userId')
            .populate('orderItems.product')

        // console.log(`Found ${orders.length} orders`);

        if (orders.length === 0) {
            return res.status(404).send('No orders found for the given period.');
        }

        const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalOrders = orders.length;
        const totalDiscount = orders.reduce((sum, order) => sum + order.discount, 0);
        const totalCustomers = new Set(orders.map(order => order.userId.name)).size;

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=salesReport.pdf');

        doc.pipe(res);

        // Title
        doc.fontSize(20).font('Helvetica-Bold')
            .text('Sales Report', { align: 'center', underline: true })
            .moveDown(1);

        // Sales Summary
        doc.fontSize(12).font('Helvetica-Bold')
            .text('Sales Summary', { underline: true })
            .font('Helvetica')
            .moveDown(0.5);

        doc.fontSize(10)
            .text(`Generated on: ${new Date().toLocaleDateString()}`)
            .text(`Total Sales: Rs. ${totalSales.toFixed(2)}`)
            .text(`Total Orders: ${totalOrders}`)
            .text(`Total Discount: Rs. ${totalDiscount.toFixed(2)}`)
            .text(`Total Customers: ${totalCustomers}`)
            .moveDown(1);

        // Table Setup
        const headers = ['Sl No', 'User Name', 'Products', 'Quantity', 'Date', 'Discount', 'Final Amount'];
        const columnWidths = [30, 80, 120, 50, 60, 60, 70];
        const ROW_HEIGHT = 50; // Increased row height
        const tableTop = doc.y;

        // Table Header
        doc.font('Helvetica-Bold').fontSize(10);
        doc.lineWidth(0.5);

        // Draw table header background
        doc.fillColor('#E0E0E0').rect(30, tableTop, 540, ROW_HEIGHT).fill();
        doc.fillColor('black');

        // Header Cells
        let xPos = 30;
        headers.forEach((header, i) => {
            doc.text(header, xPos, tableTop + 10, {
                width: columnWidths[i],
                align: 'center'
            });
            xPos += columnWidths[i];
        });

        // Header Underline
        doc.moveTo(30, tableTop + ROW_HEIGHT)
            .lineTo(570, tableTop + ROW_HEIGHT)
            .stroke();

        // Table Rows
        doc.font('Helvetica').fontSize(9);
        let currentY = tableTop + ROW_HEIGHT;

        orders.forEach((order, index) => {
            // Check if the next row fits in the page, else add a new page
            if (currentY > doc.page.height - 100) {
                doc.addPage();
                currentY = 30;
            }

            // Alternate row background
            const rowColor = index % 2 === 0 ? '#FFFFFF' : '#F5F5F5';
            const rowY = currentY;

            // Row background
            doc.fillColor(rowColor)
                .rect(30, rowY, 540, ROW_HEIGHT)
                .fill();

            // Reset to black for text
            doc.fillColor('black');

            // Calculate total quantity
            const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

            // Prepare product details
            const productDetails = order.orderItems
                .map(item => `${item.product.productName} (x${item.quantity})`)
                .join(', ');

            // Reset x position
            xPos = 30;

            // Fill row data
            doc.text(`${index + 1}`, xPos, rowY + 10, {
                width: columnWidths[0],
                align: 'center'
            });
            xPos += columnWidths[0];

            doc.text(order.userId.name, xPos, rowY + 10, {
                width: columnWidths[1],
                align: 'center'
            });
            xPos += columnWidths[1];

            doc.text(productDetails, xPos, rowY + 10, {
                width: columnWidths[2],
                align: 'left'
            });
            xPos += columnWidths[2];

            doc.text(totalQuantity.toString(), xPos, rowY + 10, {
                width: columnWidths[3],
                align: 'center'
            });
            xPos += columnWidths[3];

            doc.text(new Date(order.createdOn).toLocaleDateString(), xPos, rowY + 10, {
                width: columnWidths[4],
                align: 'center'
            });
            xPos += columnWidths[4];

            doc.text(`Rs. ${order.discount.toFixed(2)}`, xPos, rowY + 10, {
                width: columnWidths[5],
                align: 'center'
            });
            xPos += columnWidths[5];

            doc.text(`Rs. ${order.finalAmount.toFixed(2)}`, xPos, rowY + 10, {
                width: columnWidths[6],
                align: 'center'
            });

            currentY += ROW_HEIGHT;
        });

        // Optional: Add table border
        // doc.lineWidth(0.5)
        //     .rect(30, tableTop, 540, currentY - tableTop)
        //     .stroke();

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating PDF');
    }
};



const excelGenerate = async (req, res) => {
    try {
        const { start, end } = req.query;
        console.log(req.query || 'nott');
        const filter = {};
        if (start || end) {
            filter.createdOn = {};
            if (start) filter.createdOn.$gte = new Date(start);
            if (end) filter.createdOn.$lte = new Date(end)
        }
        const orders = await Order.find(filter).populate('userId').populate('orderItems.product', 'productName').exec();
        const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0);
        const totalOrders = orders.length;
        const totalDiscount = orders.reduce((sum, order) => sum + order.discount, 0);
        const totalCustomers = new Set(orders.map(order => order.userId.name)).size;

        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet 1');

        // Define columns


        worksheet.columns = [
            { header: 'Sl No', key: 'Sno', width: 5 },
            { header: 'User Name', key: 'name', width: 15 },
            { header: 'Products', key: 'Product', width: 50 },
            { header: 'Quantity', key: 'Quantity', width: 5 },
            { header: 'Date', key: 'Date', width: 15, style: { alignment: { horizontal: 'center' } } }, // Date column
            { header: 'Discount Amount', key: 'Discount', width: 10, style: { numFmt: '#,##0.00' } }, // Format number
            { header: 'Final Amount', key: 'Final', width: 10, style: { numFmt: '#,##0.00' } }, // Format number
        ];

        // Add some rows of data
        for (let i = 0; i < orders.length; i++) {
            console.log(orders[i].orderItems[0].product.productName || 'prod');
            const productDetails = orders[i].orderItems
                .map((product) => `${product.product.productName} (x${product.quantity})`)
                .join(', ');
            worksheet.addRow({ Sno: i + 1, name: orders[i].userId.name, Product: productDetails, Quantity: orders[i].orderItems.reduce((sum, product) => sum + product.quantity, 0), Date: orders[i].createdOn, Discount: orders[i].discount, Final: orders[i].finalAmount });
        }
        worksheet.addRow({ Sno: '', name: '', Product: '', Quantity: '', Date: '', Discount: '', Final: '' });
        worksheet.addRow({ Sno: '', name: '', Product: '', Quantity: '', Date: '', Discount: '', Final: '' });
        worksheet.addRow({ Sno: '', name: 'Total Sales', Product: totalSales, Quantity: '', Date: '', Discount: '', Final: '' });
        worksheet.addRow({ Sno: '', name: ' Total Orders', Product: totalOrders, Quantity: '', Date: '', Discount: '', Final: '' });
        worksheet.addRow({ Sno: '', name: 'Total Discount', Product: totalDiscount, Quantity: '', Date: '', Discount: '', Final: '' });
        worksheet.addRow({ Sno: '', name: 'Total Customer', Product: totalCustomers, Quantity: '', Date: '', Discount: '', Final: '' });




        // Set headers for the response to trigger a download
        res.setHeader('Content-Disposition', 'attachment; filename=generated-file.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Send the Excel file as a response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);

    }
}
const getSaleReportFilter = async (req, res) => {
    const { dateRange, startDate, endDate, page = 1, limit = 10 } = req.query;
    const filter = {};

    // Date range logic
    if (startDate || endDate) {
        filter.createdOn = {};
        if (startDate) filter.createdOn.$gte = new Date(startDate);
        if (endDate) filter.createdOn.$lte = new Date(endDate);
    } else if (dateRange) {
        const today = new Date();
        if (dateRange === 'today') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            filter.createdOn = { $gte: startOfDay, $lt: endOfDay };
        } else if (dateRange === 'week') {
            filter.createdOn = { $gte: new Date(today.setDate(today.getDate() - 7)) };
        } else if (dateRange === 'month') {
            filter.createdOn = { $gte: new Date(today.setMonth(today.getMonth() - 1)) };
        } else if (dateRange === 'year') {
            filter.createdOn = { $gte: new Date(today.setFullYear(today.getFullYear() - 1)) };
        }
    }

    // Fetch orders based on the filter
    const skip = (page - 1) * limit;
    const orders = await Order.find({ ...filter, orderStatus: { $nin: ["Returned", "Cancelled"] } }).sort({ createdOn: -1 })
        .populate('userId orderItems.product')
        .skip(skip)
        .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({ orders, totalPages });
}


module.exports = {
    getSaleReport,
    pdfGenerate,
    excelGenerate,
    getSaleReportFilter






}