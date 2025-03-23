const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


const getProductaddPage = async (req, res) => {

    try {

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({isBlocked:false});
        
        res.render("product-add", {
            category: category,
            brand:brand
        });

    } catch (error) {
        res.redirect("/admin/pageerror")
    }
};




const addProducts = async (req,res) => {
    try {
        const products = req.body;
        console.log(products);
        
        const productExists = await Product.findOne({
            productName:products.productName
        });
        if(!productExists){
            const images = [];
            if(req.files && req.files.length > 0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join("public","uploads","product-images",`${Date.now()}-${req.files[i].filename}`);
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);

                    fs.unlink(resizedImagePath, (err) => {
                        if (err) {
                            console.error(`Error deleting file: ${resizedImagePath}`, err);
                        }
                    });
        
                }
            }

            const category = await Category.findOne({name:products.category});
            // console.log(category)

            if(!category){
                return res.status(400).console.log("Invaild category name");

            }

            console.log(products.regularPrice,"hkjklhjlkjhkljhkljhljh");
            


            const newproduct = new Product({
                productName:products.productName,
                description:products.description,
                brand:products.brand,
                category:category._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                productImage:images,
                status:'Available',
                


            });

            await newproduct.save();
            console.log("product saved successfully");
            return res.redirect("/admin/products");
        }else{
            return res.status(400).json("Product already.Please try with another name");

        }
    } catch (error) {
        console.log("Error in saving products",error);
        
    }
}

const getAllProducts = async (req, res) => {
    try {

        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const productData = await Product.find({
            $or: [

                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                {brand:{$regex:new RegExp(".*"+search+".*","i")}}

            ],
        })
            .limit(limit * 1).
            skip((page - 1) * limit)
            .populate('category')
            .exec();

        const count = await Product.find({
            $or: [

                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                {brand:{$regex:new RegExp(".*"+search+".*","i")}}

            ],
        }).countDocuments();

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({isBlocked:false})

        if (category) {
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: page,
                totalPages: Math.ceil(count / limit),
                
               
            })
        }
        else {
            console.log('dfgfdgd');

            res.render("page-404")
        }

    } catch (error) {
        console.error(error)
        res.redirect("/pageerror")
    }

}
const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;

        if(percentage >99 || percentage < 1){
            return res.json({ status: false, message: "Please enter a value between 1 - 99" });
        }
       

        // Find the product and its category
        const findProduct = await Product.findOne({ _id: productId });

        const findCategory = await Category.findOne({ _id: findProduct.category });

        // Check if the category already has an offer
        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This product's category already has a category offer." });
        }

        // Calculate the discount and update sale price (subtract from the original price)
        const discount = Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.salePrice = Math.floor(findProduct.salePrice - discount);
       

        // Store the product offer percentage
        findProduct.productOffer = parseInt(percentage);

        await findProduct.save();

        // Reset the category offer to 0
        findCategory.categoryOffer = 0;
        await findCategory.save();

        res.json({ status: true });

    } catch (error) {
        console.error(error);
        res.redirect('/admin/pageerror');
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        
        // Find the product to remove the offer
        const findProduct = await Product.findOne({ _id: productId });

        // Get the discount percentage and calculate the restored price
        const percentage = findProduct.productOffer;
        
        // Restore the original sale price
        const discount = Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.salePrice = Math.floor(findProduct.salePrice + discount);

        // Remove the product offer
        findProduct.productOffer = 0;

        // Save the updated product
        await findProduct.save();

        res.json({ status: true });

    } catch (error) {
        console.error(error);
        res.redirect('/admin/pageerror');
    }
};

const blockProduct = async (req, res) => {

    try {

        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/products");

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const unblockProduct = async (req, res) => {
    try {


        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/products");

    } catch (error) {

        res.redirect("/admin/pageerror")

    }
}

const getEditProduct = async (req,res) => {
    try {
        const id = req.query.id;
        const product = await Product.findById(id).populate('category');
        
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("edit-product",{
            product:product,
            category:category,
            brand:brand,
            activePage: 'products'
        });
    } catch (error) {
        // res.redirect("/pageerror")
        console.log(error);
        
    }
}

const editProduct = async (req,res) => {
    try {
        const id = req.query.id;
        
        const product = await Product.findById(id)
        const data = req.body;
                                                                        
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })

        if(existingProduct){
            res.status(400).json({error:"Product with this name already exists. Please try with another name"})
            res.render('edit-product',{message:"Product with this name already exists. Please try with another name"})
        }

        const images = [];

        const category = await Category.findOne({name:data.category})
       
        

        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            req.files.forEach(file => {
                images.push(file.filename);
            });
        }

        const updateFields = {
            productName:data.productName,
            description:data.description,
            brand:data.brand,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            color:data.color
        }

        if(req.files.length>0){
            updateFields.$push = {productImage:{$each:images}};
        }

        await Product.findByIdAndUpdate(id,updateFields,{new:true});
        res.redirect('/admin/products');

    } catch (error) {
        console.error(error);
        res.redirect('/admin/pageerror')
    }
}

const deleteSingleImage = async (req,res) => {
    try {

        const {imageNameToServer,productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath = path.join("public","uploads","product-images",imageNameToServer);
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted succefully`);
        }else{
            console.log(`Imaage ${imageNameToServer} not found`);
        }
        res.send({status:true});
        
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}





module.exports = {
    getProductaddPage,
    addProducts,
    getAllProducts,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    addProductOffer,
    removeProductOffer,
}

