const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema")
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema")
const Wallet = require("../../models/walletSchema")

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
        else if(order.paymentMethod === 'Online' && order.paymentStatus === 'Completed') {
            const refundAmount = order.finalAmount;
            console.log(refundAmount);

            // Update the user's wallet
            const wallet = await Wallet.findOneAndUpdate(
                { userId },
                {
                    $inc: { balance: refundAmount }, // Increment wallet balance
                    $push: {
                        transactions: {
                            type: 'Refund',
                            amount: refundAmount,
                            orderId: id,
                            description: `Refund for cancelled order #${id}`,
                            status: 'Completed', // Assuming the refund is instant
                        },
                    },
                    lastUpdated: new Date(),
                },
                { new: true, upsert: true } // Create wallet if not present
            );

            console.log(`Refund of ₹${refundAmount} added to wallet for user ${userId}`);
        }
        // Restore stock for each product in the order
        for (const item of order.orderItems) {
            const product = await Product.findByIdAndUpdate(
                item.product, // Pass the ID directly
                { $inc: { quantity: item.quantity } },
                { new: true } // Returns the updated document
            );
            
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

const applyCoupon=async (req,res)=>{
    const {couponCode,totalPrice}=req.body;
    
    try {
        const userId=req.session.user
        if (!couponCode || !totalPrice) {
            return res.status(400).json({ success: false, message: "Missing coupon code or price" });
        }
        
        const coupon =await Coupon.findOne({name:couponCode,expireOn:{$gt:Date.now()}})
        
        if(!coupon){
            return res.json({success:false,meassge:'invalid or expired coupon'})
        }
        if(coupon.minimumPrice>totalPrice){
            return res.json({ success: false, message: `minimum price to apply coupon ${coupon.minimumPrice}` });

        }
        if(coupon.userId.includes(userId)){
            return res.json({ success: false, message: "coupon is already used by you" });

        }
        const discount = parseFloat(coupon.offerPercentage);
        console.log(discount,"discount from applycoupon");
        
        if (isNaN(discount)) {
            return res.status(400).json({ success: false, message: "Invalid discount value" });
        }
        const discountAmount = (totalPrice * discount) / 100;
        console.log(discountAmount,"discountAmount applycoupon");
        
        
        const finalTotal = totalPrice - discountAmount;
        res.status(200).json({
            success: true,
            discountAmount: discountAmount.toFixed(2),
            finalTotal: finalTotal.toFixed(2),
            message: "Coupon applied successfully!"
        });
    } catch (error) {
        console.error(error);
        
    }
}
const removeCoupon = async (req, res) => {
    try {
  
      const { totalPrice } = req.body;
  
      const discountAmount = 0;
      const finalTotal = totalPrice;
  
      return res.json({
        success: true,
        discountAmount,
        finalTotal,
      });
  
    } catch (error) {
      console.error("Error removing coupon", error);
      res.status(500);
    }
  }
  
  const getCoupons=async (req,res)=>{
    try {
        const user = req.session.user;
        if(!user){
        return res.redirect('/login');
        }
        const currentDate = new Date(); 

        const coupons = await Coupon.find({
        isList: true,
        userId: { $ne: user },
        expireOn:{$gt:currentDate}
        });
        
        res.render('couponList',{coupons});
    } catch (error) {
        
    }
}



module.exports = {
    getOrders,
    getOrderCancel,
    applyCoupon,
    removeCoupon,
    getCoupons
}