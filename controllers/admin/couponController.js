
const Coupon =require("../../models/couponSchema")

const getCoupon = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Get the current page, default to 1
        const limit = 5; // Number of coupons per page
        const skip = (page - 1) * limit;
        

        const totalCoupons = await Coupon.countDocuments(); // Get total number of coupons
        const coupons = await Coupon.find().sort({ createdOn: -1 }).skip(skip).limit(limit);

        res.render('addCoupon', {
            coupons,
            currentPage: page,
            totalPages: Math.ceil(totalCoupons / limit)
        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};

const addCoupon=async (req,res)=>{
    try {
        const  { name, expireOn, offerPercentage, minimumPrice,maxDiscount  }=req.body;
        
        const exist=await Coupon.find({name})
        if(exist&& exist.length!=0){
            console.log(exist);
            return res.status(400).json({message:'already added'})
        }
        const newCoupon= new Coupon({
            name,
            expireOn,
            offerPercentage,
            minimumPrice,
            maxDiscount
            
        })
        await newCoupon.save()

        res.status(200).json({message: 'Coupon added successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
        
    }
}
const deleteCoupon=async (req,res)=>{
    try {
        const id=req.params.id;
        await Coupon.findByIdAndDelete(id)
        res.redirect('/admin/getCoupon')
    } catch (error) {
        console.error(error);
        
    }
}











module.exports={
    getCoupon,
    addCoupon,
    deleteCoupon

}