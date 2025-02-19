const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema");

const getOrders= async (req,res)=>{
    try {
        const userId=req.session.user;
        const user = await User.findById(userId);
        if(!userId){
            console.log('user not found');
            return res.redirect('/login')
        }
        const page =parseInt(req.query.page)||1
        const limit =parseInt(req.query.limit)||10
        const skip=(page-1)*limit
        const totalOrders=await Order.countDocuments({user:userId})


        const orders=await Order.find({userId : userId}).sort({createdOn:-1}).skip(skip).limit(limit);
        const totalPages=Math.ceil(totalOrders/limit);

        res.render('orderList', {
            orders,
            user,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            limit,
            message: orders.length > 0 ? null : 'No orders found',
        });
    } catch (error) {
        console.error("Error loading orders page", error);
        res.status(404).redirect('/pageNotFound');

        
    }
}

const getOrderCancel = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            console.log('User not found');
            return res.redirect('/login');
        }

        const id = req.query.id;
        const reason = req.query.reason;
        const order = await Order.findById(id);

        if (!order) {
            console.log('Order not found');
            return res.redirect('/orders');
        }

        // If payment method is COD, mark the payment status as 'Failed'
        if (order.paymentMethod === 'COD') {
            await Order.findByIdAndUpdate(id, { $set: { paymentStatus: 'Failed' } });
        }

        // Restore stock for each product in the order
        for (const item of order.orderItems) {
            const product = await Product.findByIdAndUpdate(
                item.product, // Pass the ID directly
                { $inc: { quantity: item.quantity } },
                { new: true } // Returns the updated document
            );
            
            
            console.log(product);
            console.log(item.product);
            console.log(item.quantity);
           
        }

        // Update order status
        await Order.findByIdAndUpdate(id, { 
            $set: { orderStatus: 'Cancelled', cancellationReason: reason } 
        });

        res.redirect('/orders');
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};



module.exports = {
    getOrders,
    getOrderCancel,
}