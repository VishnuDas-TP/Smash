const User=require('../../models/userSchema');
const Order =require('../../models/orderSchema');
const Products =require('../../models/productSchema');


const getAllorders=async (req,res)=>{
    try {
        const limit=5;
        const page=Math.max(1,parseInt(req.query.page)||1)
        const orders=(await Order.find().sort({createdOn:-1}).populate('userId').populate('orderItems.product').limit(limit).skip((page-1)*limit));
        const count=await Order.countDocuments()
        res.render('orders',{orders,totalPages:Math.ceil(count/limit),currentPage:page})
    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror")
        
    }
    
}

const updateOrderStatus = async (req, res) => {
    const { newStatus } = req.body;
    const orderId = req.query.orderId
    try {
        const order = await Order.findOne({ _id:orderId });
        console.log(order)

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.orderStatus = newStatus;
        if(order.paymentMethod=='COD' && newStatus=='Delivered'){
            order.paymentStatus='Completed'
        } 
        await order.save();

        res.json({ success: true, message: 'Order status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
};


module.exports = {
    getAllorders,
    updateOrderStatus,
}