const Brand = require("../../models/brandSchema");
const Product =require("../../models/productSchema");


const getBrandPage = async (req,res) => {
    
    
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;
        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands/limit);
        const reverseBrand = brandData.reverse();

        res.render("brands",{
            data:reverseBrand,
            currentPage:page,
            totalPages:totalPages,
            totalBrands: totalBrands,
        })


    } catch (error) {
        console.log(error);
        
        res.redirect("/admin/pageerror")
    }
}

const addBrand =async (req,res) => {
    try {

        const brand = req.body.name;
        console.log(brand);
        
        
        
        const findBrand = await Brand.findOne({brand});

        if(!findBrand){
            const image = req.file.filename;
            const newBrand = new Brand({
                brandName:brand,
                brandImage:image,
            })
            await newBrand.save();
            res.redirect("/admin/brands");
        }
        
    } catch (error) {
        console.log(error);
        res.redirect("/admin/pageerror")       
    }
}

const blockBrand =async (req,res) => {
    try {

        const id = req.query.id;
        
        
        await Brand.findByIdAndUpdate(id,{$set:{isBlocked:true}});
        res.redirect('/admin/brands')
        
    } catch (error) {
        res.redirect("/admin/pageerror")
        console.log(error);
        
    }
}

const unblockBrand =async (req,res) => {
    try {

        const id = req.query.id;
       
        
        await Brand.findByIdAndUpdate(id,{$set:{isBlocked:false}});
        res.redirect('/admin/brands')
        
    } catch (error) {
        res.redirect("/admin/pageerror")
        console.log(error);
        
    }
}

const deleteBrand = async (req,res) => {
    try {

        const id = req.query.id;
        await Brand.findByIdAndDelete(id);
        res.redirect("/admin/brands")
        
    } catch (error) {
        
    }
}



 module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unblockBrand,
    deleteBrand
 }