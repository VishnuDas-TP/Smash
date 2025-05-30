const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const Product = require("../../models/productSchema")
const Order = require("../../models/orderSchema")
const bcrypt = require("bcrypt");
const { session } = require("passport");


const pageerror = async (req,res) => {
    res.render("admin-error")
    
}

const loadLogin =async (req,res) => {
    try {
        if(!req.session.admin){
            res.render("admin-login",{message:null});
        }
        else{
            res.redirect("/admin");
        }
        
    } catch (error) {
        
    }
    
}


const login = async (req,res) => {
    try {

        const {email,password} = req.body;
        const admin = await User.findOne({email,isAdmin:true});


        if (admin){
            const passwordMatch =await bcrypt.compare(password,admin.password)
            

            if(passwordMatch){
                req.session.admin = admin._id;
                return res.redirect("/admin")
            }
            else{
                return res.render("admin-login",{message:"Incorrect Password"});
            }

        }
        else{
            return res.render('admin-login',{message:"User not fuond"});
        }
        
    } catch (error) {
        console.log("login error",error);
        return res.redirect("/pageerror")
        
    }
    
}

const logout = async (req,res) => {

    try {
        
        req.session.destroy(err=>{
            if(err){
                console.log("error destroying sessison");
                return res.redirect("/pageerror")
            }else{
                res.redirect("/admin/login")
            }
        })
        
    } catch (error) {
        console.log("unexpected error during logout",error);
        res.redirect("/pageerror")
    }
    
}

const loadDashboard=async (req,res)=>{
    if(req.session.admin){
        try {
            

            const salesData = await getTotalSales();
            const products = await getMostSellingProducts();
            const categories = await getMostSellingCategories();
            const brands = await getMostSellingBrands();
            const totalOrders = await Order.countDocuments();
            const totalProducts = await Product.countDocuments()


            res.render('dashboard', { 
                salesData: JSON.parse(JSON.stringify(salesData)), 
                products: JSON.parse(JSON.stringify(products)), 
                categories: JSON.parse(JSON.stringify(categories)), 
                brands: JSON.parse(JSON.stringify(brands)),
                totalOrders,
                totalProducts
            });
        } catch (error) {
            res.redirect('/pageerror')
            
        }
    }
    else{
        res.redirect("/admin/login")
    }
    
}
async function getTotalSales() {
    try {
        const totalSales = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalSalesAmount: { $sum: "$finalAmount" }
                }
            }
        ]);

        const weeklySales = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: new Date(new Date().getFullYear(), 0, 1) // Start of current year
                    }
                }
            },
            {
                $group: {
                    _id: { $isoWeek: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            }
        ]);
        const monthlySales = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: new Date(new Date().getFullYear(), 0, 1) 
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            }
        ]);
        const yearlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $year: "$createdOn" },
                    sales: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id": 1 }
            },
            {
                $limit: 5 
            }
        ]);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const totalWeeks=52
        const weeklyData = {
            labels: Array.from({ length: totalWeeks }, (_, i) => `Week ${i + 1}`),
            data: Array(totalWeeks).fill(0)
        };
        weeklySales.forEach(item => {
            const weekIndex = item._id - 1; // Convert to zero-based index
            if (weekIndex >= 0 && weekIndex < totalWeeks) {
                weeklyData.data[weekIndex] = item.sales;
            }
        });
        const monthlyData = {
            labels: monthNames,
            data: Array(12).fill(0)
        };
        monthlySales.forEach(item => {
            const monthIndex = item._id - 1; // Convert to zero-based index
            monthlyData.data[monthIndex] = item.sales;
        });
        const currentYear = new Date().getFullYear();
        const yearlyData = {
            labels: Array.from({ length: 5 }, (_, i) => (currentYear - 4 + i).toString()),
            data: Array(5).fill(0)
        };
        yearlySales.forEach(item => {
            const yearIndex = yearlyData.labels.indexOf(item._id.toString());
            if (yearIndex !== -1) {
                yearlyData.data[yearIndex] = item.sales;
            }
        });
        return {
            totalSalesAmount: totalSales.length > 0 ? totalSales[0].totalSalesAmount : 0,
            weekly: weeklyData,
            monthly: monthlyData,
            yearly: yearlyData
        };






    } catch (error) {
        console.error("Error calculating sales data:", error);
        return {
            totalSalesAmount: 0,
            weekly: { labels: [], data: [] },
            monthly: { labels: [], data: [] },
            yearly: { labels: [], data: [] }
        };
    
        
    }
    

}

async function getMostSellingProducts() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$orderItems.product",
                    productName: { $first: "$productDetails.productName" },
                    totalQuantitySold: { $sum: "$orderItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling product:", error);
    }
}

async function getMostSellingCategories() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },

            { $unwind: "$categoryDetails" },

            {
                $group: {
                    _id: "$productDetails.category",
                    categoryName: { $first: "$categoryDetails.name" },
                    totalQuantitySold: { $sum: "$orderItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 }
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category:", error);
    }
}

async function getMostSellingBrands() {
    try {
        const result = await Order.aggregate([
            { $unwind: "$orderItems" },

            {
                $lookup: {
                    from: "products",
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },

            { $unwind: "$productDetails" },

            {
                $group: {
                    _id: "$productDetails.brand",
                    totalQuantitySold: { $sum: "$orderItems.quantity" }
                }
            },

            { $sort: { totalQuantitySold: -1 } },

            { $limit: 10 },
        ]);

        result.forEach(item => {
            item._id = item._id.toString();
        });

        return result;
    } catch (error) {
        console.error("Error finding most selling category and brand:", error);
    }
}






module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,

}