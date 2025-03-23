const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const brandController = require("../controllers/admin/brandController")
const orderController = require("../controllers/admin/orderController")
const couponController = require("../controllers/admin/couponController")
const saleReportController = require("../controllers/admin/salesReportcontroller")
const stockController = require("../controllers/admin/stockController")

const {userAuth,adminAuth} = require("../middlewares/auth")

const multer=require('multer');
const storage=require('../helpers/multer');
const Return = require("../models/returnSchema");
const uploads=multer({storage:storage})



router.get("/pageerror",adminController.pageerror);
// Login management
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/logout",adminController.logout);
// customer management
router.get("/",adminAuth,adminController.loadDashboard);
router.get('/users',adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);
// category management
router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listCategory",adminAuth,categoryController.getListCategory)
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);
// Product Management
router.get("/addProduct",adminAuth,productController.getProductaddPage);
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);
router.post('/addProductOffer',adminAuth,productController.addProductOffer);
router.post('/removeProductOffer',adminAuth,productController.removeProductOffer);

// stock management
router.get('/stock',adminAuth,stockController.getStocks)
router.post('/update-stock',adminAuth,stockController.updateStock)


// brand management
router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,brandController.addBrand);
router.get("/blockBrand",adminAuth,brandController.blockBrand)
router.get("/unblockBrand",adminAuth,brandController.unblockBrand)
router.get("/deleteBrand",adminAuth,brandController.deleteBrand)

// Order menagement
router.get('/allOrders',adminAuth,orderController.getAllorders);
router.get("/order-details/:id", adminAuth,orderController.getOrderDetails);
router.post('/update-order-status',adminAuth,orderController.updateOrderStatus);


// Return management
router.get('/getReturnRequest',adminAuth,orderController.getReturnPage)
router.post('/returnDataUpdate',adminAuth,orderController.returnRequest);

// coupon manegement 
router.get("/getCoupon",adminAuth,couponController.getCoupon)
router.post('/add-coupon',adminAuth,couponController.addCoupon)
router.get('/delete-coupon/:id',adminAuth,couponController.deleteCoupon)

// sales report management
router.get('/saleReport',adminAuth,saleReportController.getSaleReport)
router.get('/salesReportPDF',adminAuth,saleReportController.pdfGenerate)
router.get('/salesReportExcel',adminAuth,saleReportController.excelGenerate)
router.get('/filterSales',adminAuth,saleReportController.getSaleReportFilter)




module.exports =router;