const Wallet=require('../../models/walletSchema')
const env = require('dotenv').config()
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadWallet = async (req, res) => {
    try {
        const userId = req.session.user; // Logged-in user ID
        if (!userId) {
            return res.redirect('/login');
        }

        // Pagination setup
        const page = parseInt(req.query.page) || 1; // Current page (default is 1)
        const limit = parseInt(req.query.limit) || 5; // Number of transactions per page
        const skip = (page - 1) * limit;

        // Fetch wallet details
        const wallet = await Wallet.findOne({ userId }).populate('transactions.orderId').sort({transactions : 1}).lean();

        if (!wallet) {
            return res.render('wallet', {
                balance: 0,
                transactions: [],
                currentPage: page,
                totalPages: 0,
                limit,
                keyId:process.env.RAZORPAY_KEY_ID

            });
        }

        // Pagination logic
        const totalTransactions = wallet.transactions.length; // Total transactions
        const paginatedTransactions = wallet.transactions
            .slice()
            .reverse()
            .slice(skip, skip + limit); // Apply skip and limit

        const totalPages = Math.ceil(totalTransactions / limit); // Total pages

        // Render the wallet page with paginated data
        res.render('wallet', {
            balance: wallet.balance || 0,
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages,
            limit,
            keyId:process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error loading wallet page:', error);
        res.redirect('/pageNotFound');
    }
};


const createWallet = async (req, res) => {
    try {
        const amount = req.body.amount * 100;  // Convert to paise
        const options = {
            amount: amount,
            currency: "INR",
            receipt: "order_rcptid_11", // Use dynamic receipt id
            payment_capture: 1
        };
        

        razorpay.orders.create(options, (err, order) => {
            if (err) {
                return res.status(500).json({ message: 'Error creating order', error: err });
            }
            
        console.log('    16');
            // Save the amount to session or pass it to the front end
            req.session.amount = amount;  // Store amount in session (you can use other ways to store it)
            
        console.log('    15');
            res.json({ orderId: order.id, amount: order.amount });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Error creating order', error: error });
    }
}


module.exports={
    loadWallet,
    createWallet,
}