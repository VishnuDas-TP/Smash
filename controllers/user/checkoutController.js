const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema")


const getCheckOut = async (req, res) => {
    try {

        const userId = req.session.user
        const address = await Address.findOne({ userId: userId }) || [];

        const singleProductId = req.query.productId;
        const singleProductQty = req.query.quantity;


        let cart = null;
        let product = null;
        let totalPrice = 0;


        if (singleProductId) {
            product = await Product.findById(singleProductId);
            if (!product) {
                return res.status(404).send("Product not found");
            }
            totalPrice = singleProductQty * product.salePrice
        }
        else {
            cart = await Cart.findOne({ userId: userId }).populate('items.productId')

            if (cart && cart.items.length > 0) {
                totalPrice = cart.items.reduce((sum, items) => sum + items.totalPrice, 0)
            }
        }

        res.render("checkout", {
            address: address.address,
            product,
            cart,
            totalPrice,
            singleProductQty,
            singleProductId
        })

    } catch (error) {
        console.log("error loading checkout", error);
        res.status(500)
    }
}

const placeOrderInitial = async (req, res) => {
    try {
        // Extract data from request body
        let {
            addressId,
            paymentMethod,
            paymentStatus,
            singleProduct, // Single product ID field
            singleProductQty // Quantity for the single product order
        } = req.body;

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
                price: product.price
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
                price: item.productId.salePrice
            }));

            // Calculate cart subtotal
            subtotal = cart.items.reduce((total, item) => total + (item.productId.salePrice * item.quantity), 0);

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

        let discount = 0; // Apply any discounts if necessary
        const total = subtotal - discount;

        // Create new order
        const order = new Order({
            userId: req.session.user,
            orderItems: items,
            address: specAddress,
            paymentMethod,
            paymentStatus,
            orderStatus: 'Pending',
            totalPrice: subtotal,
            finalAmount: total,
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
            orderId: order._id
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





module.exports = {
    getCheckOut,
    placeOrderInitial,
    orderConfirm,
}