const { name } = require("ejs");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Products = require("../../models/productSchema")


const categoryInfo = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;

        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments();
        const totalPage = Math.ceil(totalCategories/limit);
        res.render("category",{
            cat:categoryData,
            currentPage : page,
            totalPage :totalPage,
            totalCategories :totalCategories
        });

    } catch (error) {
        console.error(error);
        res.redirect("/pageerror")
        
    }
    
}

const addCategory = async (req,res) => {

    const {name,description} = req.body;
    console.log(name);
    

    try {

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(name, "i") } // Case-insensitive exact match
        });
        
        console.log(existingCategory);
        
        
        if(existingCategory){
            console.log("wrking");
            
            return res.status(400).json({error:"Category already exists"});
        }
        const newCategory = new Category({
            name,
            description,
        })
        await newCategory.save();
        return res.json({message:"Category added Successfully"})

    } catch (error) {
        return res.status(500).json({error:"Internal sever error"})
    }
    
}

const addCategoryOffer = async (req,res) => {
    try {
        
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        
        const category = await Category.findById(categoryId);
        // console.log(category,categoryId,percentage);
        

        if(!category){
            return res.status(400).json({status:false,message:"Category not found"});
        }
        if(percentage > 99 || percentage < 1){
            return res.json({status:false,message:"Please enter a value between 1 - 99"})
        }
        const products = await Product.find({category:category._id});
        const hasProductOffer = products.some((product)=>product.productOffer > percentage);
        if(hasProductOffer){
            returnres.json({status:false,message:"Product within this category already have product offer"})
        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});

        for(const product of products){
            product.productOffer = 0;
            product.salePrice = product.regularPrice
            await product.save();
        }
        res.json({status:true});

    } catch (error) {
        res.status(500).json({status:false,message:"Internal server Error"})
    }
    
}

const removeCategoryOffer =async (req,res) => {
    try {
        
        const categoryId = req.body.catId;
        const category = await Category.findById(categoryId);
        
        
        if(!category){
            return res.status(404).json({success:false,message:"Category not found"})
        }
        const percentage = category.categoryOffer;
        const products = await Product.find({category:category._id});

        if(products.length>0){
            for(const product of products){
                product.salePrice += Math.floor(product.regularPrice * (percentage/100));
                product.productOffer =0;
                await product.save();
            }
        }

        category.categoryOffer =0;
        await category.save();
        res.status(200).json({success:true});

    } catch (error) {
        console.log(error)
        res.status(500).json({status:false, message:"Internal server Error"})
    }
}

const getListCategory = async (req,res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect("/admin/category");

    } catch (error) {
        res.redirect("/pageerror");
    }
    
}

const getUnlistCategory = async (req,res) => {
    
    
    try {

        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect("/admin/category");
        
    } catch (error) {
        res.redirect("/pageerror");
    }
}

const getEditCategory = async (req,res) => {
    
    try {

        const id = req.query.id;
        const category = await Category.findOne({_id:id});
        
        res.render("edit-category",{category:category});
        
    } catch (error) {
        res.redirect("/pageerror");
    }
}

const editCategory = async (req,res) => {
    try {
        const id = req.params.id;
        const {categoryName,description} = req.body;
        const existingCategory = await Category.findOne({name:{$regex:categoryName,$options:"i"},_id:{$ne:id}})
        
        if(existingCategory){
            return res.status(400).json({error:"Category exist, please choose another name"});
        }

        const updateCategory = await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description,
        },{new:true});

        if(updateCategory){
            res.redirect("/admin/category")
        }else{
            res.status(404).json({error:"category not found"})
        }

    } catch (error) {
        res.status(500).json({error:"Internal server Error"})
    }
}



module.exports = {
    addCategory,
    categoryInfo,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    
}