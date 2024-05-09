const express = require('express');
const app = express();
const mongoose = require('mongoose');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const multer = require('multer');
app.set('view engine', 'ejs')

app.use('/uploads', express.static('uploads'));
app.set('view engine', 'ejs')
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret:'vfdfnvjdflvdljv',
    resave:false,
    saveUninitialized:false
}))
app.get('/signup',(req,res)=>{
    res.render('signup')
})
app.get('/login',(req,res)=>{
    res.render('login')
})
app.get('/add',(req,res)=>{
    res.render('add')
})


mongoose.connect('mongodb://127.0.0.1:27017/AddToCart')
let schema = new mongoose.Schema({
    name:{
        type:String
    },
    email:{
        type:String,
        unique:true
    },
    password:{
        type:String
    },
    role:{
        type:String,
        // enum:['seller','user'],
        default:'user'
    },
    token:{
        type:String
    },
    cart:[
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'sign'
            },
            quantity: {
                type: Number,
                default: 1
            }
        }
    ]
})
let model = mongoose.model('AddToCart',schema);

let add = new mongoose.Schema({
    name:{
        type:String
    },
    price:{
        type:Number
    },
   image:{
    type:String
}
})
let sign = mongoose.model('sign',add)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  
  // Create the multer instance
  const upload = multer({ storage: storage });
app.post('/signup',async(req,res)=>{
    try {
        let {name,email,password,role} = req.body;
        if (role === 'on') {
            role = 'seller';
        } else {
            role = 'user';
        }
        const token = jwt.sign({email},'hbdnasdmclkmsc',{expiresIn:'1h'})
        let data = await new model({name,email,password,role,token});
        data.token = token
        await data.save();
        res.redirect('/login') 
    } catch (error) {
        console.log(error);
    }
})

app.post('/login',async(req,res) => {
try {
    const {email,password} = req.body;
    let user = await model.findOne({email});

    if(!user){
        res.send('user not find')
    }

    if(password !== user.password){
     res.send('password does not match')
    }
    req.session.user = user;

    if(user.role === 'seller'){
        res.redirect('/add')
    }else{
          res.redirect('/')
    }

} catch (error) {
    console.log(error);
}
})
app.post('/add',upload.single('image'),async(req,res)=>{
    try {
        let image = req.file.filename;
        let {name,price} = req.body;

        let data = await new sign({name,image,price});
        await data.save();
        res.send('product saved successfully ')
    } catch (error) {
        console.log(error);
    }
})

app.get('/',async(req,res)=>{
   let data = await sign.find({})
   res.render('home',{data:data})
})

app.post('/add-to-cart', async (req, res) => {
    try {
        const { productId } = req.body;
 
        const user = await model.findById(req.session.user._id); 
        if (!user) {
            return res.status(401).send('User not authenticated');
        }
        user.cart.push(productId);
        await user.save();
       res.redirect('/')
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/cart',async(req,res)=>{
    try {
        const user = await model.findById(req.session.user._id).populate('cart');
        if (!user) {
            return res.status(401).send('User not authenticated');
        }
        const cartItems = user.cart;
        res.render('cart',{cartItems:cartItems})
    } catch (error) {
        console.log(error);
    }
})

app.post('/increment-quantity', async (req, res) => {
    try {
        const { productId } = req.body;
        const user = await model.findById(req.session.user._id); 
        if (!user) {
            return res.status(401).send('User not authenticated');
        }
        // Find the item in the cart
        const itemIndex = user.cart.findIndex(item => item._id === productId);
        if (itemIndex === -1) {
            return res.status(404).send('Item not found in cart');
        }
        // Increment the quantity
        user.cart[itemIndex].quantity++;
        await user.save();
        res.redirect('/cart');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



('rzp_test_bilBagOBVTi4lE','77yKq3N9Wul97JVQcjtIVB5z')