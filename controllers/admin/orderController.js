const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Products = require('../../models/productSchema');
const Return = require("../../models/returnSchema")
const Wallet = require("../../models/walletSchema")
const Address = require("../../models/addressSchema");
const Product = require('../../models/productSchema');

const getAllorders = async (req, res) => {
    try {
        const limit = 5;
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const orders = (await Order.find().sort({ createdOn: -1 }).populate('userId').populate('orderItems.product').limit(limit).skip((page - 1) * limit));
        const count = await Order.countDocuments()
        res.render('orders', { orders, totalPages: Math.ceil(count / limit), currentPage: page })
    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror")

    }

}

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Fetch the order details by ID and populate necessary fields
        const order = await Order.findById(orderId)
            .populate("userId")
            .populate("orderItems.product");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Fetch the address details
        const address = order.address

        // Extract products from order
        const products = order.orderItems.map(item => item.product);

        // Render the order details page with fetched data
        res.render("order-details", { order, address, products });

    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal Server Error");
    }
};

const updateOrderStatus = async (req, res) => {
    const { newStatus } = req.body;
    const orderId = req.query.orderId
    try {
        const order = await Order.findOne({ _id: orderId });
        console.log(order)
        const userId = req.session.userId

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.orderStatus = newStatus;
        if (newStatus == 'Cancelled') {
            const wallet = await Wallet.findOneAndUpdate({ userId }, { $inc: { balance: amount }, $push: { transactions: { type: 'Refund', amount, orderId, description: 'Refund for your Cancelled product' } } },{upsert:true})
            // console.log(wallet);

             await Order.findByIdAndUpdate(orderId, { $set: { orderStatus: 'Returned' } }).populate('orderItems')

            await Promise.all(order.orderItems.map(async (item) => {
                await Product.findByIdAndUpdate(item.product, { $inc: {quantity: item.quantity } })
            }))

        }
        if (order.paymentMethod == 'COD' && newStatus == 'Delivered') {
            order.paymentStatus = 'Completed'
        }

        await order.save();

        res.json({ success: true, message: 'Order status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};

const getReturnPage = async (req, res) => {
    try {
        const limit = 5;

        const page = Math.max(1, parseInt(req.query.page)) || 0
        const skip = (page - 1) / limit
        const returnData = await Return.find().populate('userId').populate('orderId').sort({ createdAt: -1 }).limit(limit).skip(skip);

        // console.log(returnData);
        const count = await Return.countDocuments();
        res.render('returnOrder', {
            returns: returnData,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        })

    } catch (error) {
        console.error(error);
        res.redirect('/admin/pageerror')
    }
}
const returnRequest = async (req, res) => {
    try {
        const status = req.body.status;
        const returnId = req.query.id;

        const returnData = await Return.findById(returnId);
        if (!returnData) {
            return res.json({ message: 'retun id not found' })

        }
        const orderId = returnData.orderId;
        const userId = returnData.userId;
        const amount = returnData.refundAmount;
        // console.log(orderId);

        if (status == 'approved') {
            const wallet = await Wallet.findOneAndUpdate({ userId }, { $inc: { balance: amount }, $push: { transactions: { type: 'Refund', amount, orderId, description: 'Refund for your returned product' } } },{upsert:true})
            // console.log(wallet);

            returnData.returnStatus = 'approved';
            await returnData.save();
            const order = await Order.findByIdAndUpdate(orderId, { $set: { orderStatus: 'Returned' } }).populate('orderItems')

            await Promise.all(order.orderItems.map(async (item) => {
                await Product.findByIdAndUpdate(item.product, { $inc: {quantity: item.quantity } })
            }))

        } else if (status == 'rejected') {
            returnData.returnStatus = status;
            await returnData.save();
            await Order.findByIdAndUpdate(orderId, { $set: { orderStatus: 'Return Requested' } })

        } else {
            return res.status(400).json({ message: 'something wend wrong' })
        }
        res.redirect('/admin/getReturnRequest')


    } catch (error) {
        console.log(error)
        res.redirect('/admin/pageerror')
    }
}




module.exports = {
    getAllorders,
    getOrderDetails,
    updateOrderStatus,
    getReturnPage,
    returnRequest,

}