const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Razorpay = require("razorpay")
const crypto = require('crypto');
const Wallet = require("../../models/walletSchema");
const { error } = require("console");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const RAZORPAY_MAX_AMOUNT = 5000000000;
const RAZORPAY_MIN_AMOUNT = 100;


const getCheckOut = async (req, res) => {
    try {

        const userId = req.session.user
        const address = await Address.findOne({ userId: userId }) || [];
        // console.log(address.length,"sadfghj");


        const singleProductId = req.query.productId || null;
        const singleProductQty = req.query.quantity || null;

        let cart = null;
        let product = null;
        let totalPrice = 0;
        let discount = 0;
        let price =0

        if (singleProductId) {
            product = await Product.findById(singleProductId).populate('category');
            const singleProductStock = product.quantity;

            if (singleProductStock < singleProductQty) {
                return res.status(404).json({ message: "Insufficient Stock" });
            }
            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }

            price = product.salePrice;
            let categoryOffer = product.category.categoryOffer

            if (categoryOffer > product.productOffer) {
                price = product.regularPrice - (categoryOffer / 100) * product.regularPrice
            }

            totalPrice = singleProductQty * price
        }
        else {
            cart = await Cart.findOne({ userId: userId }).populate('items.productId')

            if (cart && cart.items.length > 0) {
                totalPrice = cart.items.reduce((sum, items) => sum + items.totalPrice, 0)
            }
            // **Check stock availability for all products**
            for (const item of cart.items) {
                if (item.productId.quantity < item.quantity) {
                    return res.status(404).json({
                        success: false,
                        message: `Insufficient stock for ${item.productId.productName}`
                    });
                }
            }
        }




        res.render("checkout", {
            address: address.address ? address.address || [] : [],
            product,
            cart,
            price,
            totalPrice,
            discount,
            singleProductQty,
            singleProductId
        })

    } catch (error) {
        console.log("error loading checkout", error);
        res.status(500).json({ message: 'error loading checkout' })
    }
}

const placeOrderInitial = async (req, res) => {
    console.log("placeorder start");

    try {
        // Extract data from request body

        let {
            addressId,
            paymentMethod,
            paymentStatus,
            singleProduct, // Single product ID field
            singleProductQty, // Quantity for the single product order
            totalPrice,
            finalPrice,
            coupon,
            discount,
            price
        } = req.body;
        console.log(req.body);


        singleProduct && (singleProduct = JSON.parse(singleProduct));

        let items = []; // Order items array
        let subtotal = 0;

        // Get delivery address
        const addressDoc = await Address.findOne({ "address._id": addressId });
        if (!addressDoc) {
            return res.status(400).json({
                success: false,
                message: 'Invalid delivery address'
            });
        }
        const specAddress = addressDoc.address.find((item) => item._id == addressId);

        // Handle Single Product Order
        if (singleProduct) {
            const product = await Product.findById(singleProduct._id);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const orderQuantity = parseInt(singleProductQty) || 1;

            // **Check stock availability**
            if (product.stock < orderQuantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient stock'
                });
            }

            // Add single product to order
            items.push({
                product: product._id,
                quantity: orderQuantity,
                price: price
            });

            // Calculate total price
            subtotal = product.salePrice * orderQuantity;

            // **Update stock after order**
            await Product.updateOne(
                { _id: product._id },
                { $inc: { quantity: -orderQuantity } } // Decrease stock
            );

        } else {
            // Handle Cart Order
            const cart = await Cart.findOne({ userId: req.session.user }).populate('items.productId');

            if (!cart || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cart is empty'
                });
            }

            // Map cart items into order format
            items = cart.items.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.price
            }));
            console.log(items);



            // **Check stock availability for all products**
            for (const item of cart.items) {
                if (item.productId.quantity < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${item.productId.name}`
                    });
                }
            }

            // **Update stock for all cart items**
            for (const item of cart.items) {
                await Product.updateOne(
                    { _id: item.productId._id },
                    { $inc: { quantity: -item.quantity } } // Decrease stock
                );
            }
        }



        // Create new order
        const order = new Order({
            userId: req.session.user,
            orderItems: items,
            address: specAddress,
            paymentMethod,
            paymentStatus,
            orderStatus: 'Pending',
            discount,
            totalPrice,
            finalAmount: finalPrice,
            couponCode: coupon,
            couponApplied: Boolean(coupon && discount),
            orderedAt: new Date()

        });

        await order.save();

        // Clear the cart after order placement (only if a cart order was placed)
        if (!singleProduct) {
            await Cart.updateOne({ userId: req.session.user }, { $set: { items: [], total: 0 } });
        }

        // Send success response
        res.status(200).json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id,
            razorpayKey: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Order placement error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to place order'
        });
    }
};



const orderConfirm = async (req, res) => {
    try {

        const id = req.query.id
        const order = await Order.findById(id);
        res.render('success-CheckOut', { orderId: order._id })

    } catch (error) {
        console.error("Error loading cofirmation page", error);
        res.redirect('/page-not-found');
    }
}

const createOrder = async (req, res) => {
    try {
        const { amount, addressId } = req.body;
        const userId = req.session.user;
        // console.log(req.body);

        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount. Amount must be a positive number'
            });
        }

        if (!addressId) {
            return res.status(400).json({
                success: false,
                message: 'Delivery address is required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        const amountInPaise = Math.round(amount * 100);

        if (amountInPaise < RAZORPAY_MIN_AMOUNT) {
            return res.status(400).json({
                success: false,
                message: `Amount must be at least ₹${RAZORPAY_MIN_AMOUNT / 100}`
            });
        }

        if (amountInPaise > RAZORPAY_MAX_AMOUNT) {
            return res.status(400).json({
                success: false,
                message: `Amount exceeds maximum limit of ₹${RAZORPAY_MAX_AMOUNT / 100}`
            });
        }

        // Generate unique receipt ID
        const receipt = crypto
            .randomBytes(16)
            .toString('hex');

        // console.log('recept',receipt);

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt,
            notes: {
                userId: userId.toString(),
                addressId: addressId.toString()
            }
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Store order ID in session with expiry
        req.session.razorpayOrderId = razorpayOrder.id;
        req.session.razorpayOrderExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes expiry
        res.status(200).json({
            success: true,
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            receipt: razorpayOrder.receipt
        });
        console.log(razorpayOrder.amount, "razorpayOrder.amount createorder");


    } catch (error) {
        console.error('Razorpay order creation error:', error);

        // Enhanced error handling
        if (error.error && error.error.code === 'BAD_REQUEST_ERROR') {
            return res.status(400).json({
                success: false,
                message: error.error.description || 'Invalid request parameters',
                error: error.error
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: error.message
        });
    }
};
const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment verification parameters'
            });
        }

        if (!req.session.razorpayOrderId || !req.session.razorpayOrderExpiry ||
            Date.now() > req.session.razorpayOrderExpiry) {
            return res.status(400).json({
                success: false,
                message: 'Order session has expired'
            });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature'
            });
        }

        if (req.session.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({
                success: false,
                message: 'Order verification failed'
            });
        }

        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        if (payment.status !== 'captured') {
            return res.status(400).json({
                success: false,
                message: `Payment not captured. Current status: ${payment.status}`
            });
        }

        delete req.session.razorpayOrderId;
        delete req.session.razorpayOrderExpiry;

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            paymentId: razorpay_payment_id,
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
};
const retryPayment = async (req, res) => {
    const orderId = req.body.orderId || req.query.orderId;

    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    try {
        const razorpayOrder = await razorpay.orders.create({
            amount: order.finalAmount * 100,
            currency: order.currency,
            receipt: `order_rcptid_${order.id}`,
        });

        req.session.razorpayOrderId = razorpayOrder.id;
        req.session.razorpayOrderExpiry = Date.now() + (30 * 60 * 1000);

        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            amount: order.finalAmount,
            currency: order.currency
        });
    } catch (error) {
        console.error(error)
        res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
    }
}

const walletPayment = async (req, res) => {
    try {
        const userId = req.session.user;
        let { cart, totalPrice, addressId, singleProduct, finalPrice,price, coupon, discount } = req.body;
        // console.log(req.body);


        if (typeof singleProduct === 'string') {
            singleProduct = JSON.parse(singleProduct); // ✅ Convert string to object
        }


        if (!userId || !finalPrice || (!cart && !singleProduct)) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });

        }

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(400).json({ success: false, message: 'Wallet not found.' });
        }

        const amount = parseFloat(finalPrice);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid final price.' });
        }

        if (wallet.balance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
        }

        const addressDoc = await Address.findOne({userId})
        const address = addressDoc.address.find(addr => addr._id.toString() === addressId.toString())

        let orderedItems = [];
        if (singleProduct) {

            const product = await Product.findById(singleProduct._id);
            orderedItems.push({
                product: product._id,
                quantity: 1,
                price: price,
            });
            await Product.findByIdAndUpdate(product._id, {
                $inc: { quantity: -1 },
            });
        } else if (cart) {
            const cartItems = cart;
            orderedItems = cartItems.map(item => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price ,
            }));
            cartItems.forEach(async item => {
                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { quantity: -item.quantity },
                });
            });
        }
        console.log(orderedItems);


        const newOrder = new Order({
            orderItems: orderedItems,
            totalPrice,
            discount: discount,
            finalAmount: finalPrice,
            userId: userId,
            address: address,
            status: 'pending',
            paymentMethod: 'Wallet',
            paymentStatus: 'Completed',
            orderStatus: "Pending",
            couponCode: coupon,
            couponApplied: Boolean(coupon && discount),
        });

        await newOrder.save();

        const walletData = {
            $inc: { balance: -newOrder.finalAmount },
            $push: {
                transactions: {
                    type: "Purchase",
                    amount: newOrder.totalPrice,
                    orderId: newOrder._id
                }
            }
        }

        await Wallet.findOneAndUpdate(
            { userId: userId },
            walletData,
            { upsert: true, new: true }
        );


        res.status(200).json({ success: true, orderId: newOrder._id });
    } catch (error) {
        console.error("Error processing wallet payment:", error);
        res.status(500).json({ success: false, message: 'Failed to process wallet payment. Please try again.' });
    }
};

const placeOrder = async (req, res) => {
    try {
        const { orderId, paymentDetails, paymentSuccess } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (paymentSuccess) {
            order.paymentStatus = 'Completed';
        } else {
            order.paymentStatus = 'Pending';
        }

        if (paymentDetails) {
            order.paymentDetails = paymentDetails;
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: `Order ${paymentSuccess ? 'completed' : 'pending due to payment failure'}`,
            orderId: order._id
        });
    } catch (error) {
        console.error("Error updating order payment status:", error);
        res.status(500).json({ success: false, message: 'Failed to update order. Please try again.' });
    }
};

const paymentFailed = async (req, res) => {
    try {

        const { errorReference, message } = req.query;
        const orderId = req.query.id;
        res.render('payment-failed', { errorReference, message, orderId });

    } catch (error) {

    }
}




module.exports = {
    getCheckOut,
    placeOrderInitial,
    orderConfirm,
    createOrder,
    verifyPayment,
    retryPayment,
    walletPayment,
    placeOrder,
    paymentFailed

}