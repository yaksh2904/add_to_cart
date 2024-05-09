const express = require('express');
const app = express();
const mongoose = require('mongoose');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const multer = require('multer');
// const stripe = require('stripe')('sk_test_51ONZYOSAJLtohZuHS2V3Qc2dexwtqMVBLEq3J0kVpIGoREaoVCHtDyihllEZEza3vL3XlWfLBNCHauNycXnAMTu000SGNO2iam');
app.set('view engine', 'ejs');


app.use('/uploads', express.static('uploads'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'vfdfnvjdflvdljv',
        resave: false,
        saveUninitialized: false
    })
);

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/add', (req, res) => {
    res.render('add');
});

mongoose.connect('mongodb://127.0.0.1:27017/AddToCart');

let schema = new mongoose.Schema({
    name: {
        type: String
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String
    },
    role: {
        type: String,
        default: 'user'
    },
    token: {
        type: String
    },
    cart:[{
        product:{
         type  : mongoose.Schema.Types.ObjectId,
           ref:'sign'

        },
        quantity:{
            type:Number,
            default:1
        }
    }]
  
});

let model = mongoose.model('AddToCart', schema);

let add = new mongoose.Schema({
    name: {
        type: String
    },
    price: {
        type: Number
    },
    image: {
        type: String
    }
});

let sign = mongoose.model('sign', add);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.post('/signup', async (req, res) => {
    try {
        let { name, email, password, role } = req.body;
        if (role === 'on') {
            role = 'seller';
        } else {
            role = 'user';
        }
        const token = jwt.sign({ email }, 'hbdnasdmclkmsc', { expiresIn: '1h' });
        let data = await new model({ name, email, password, role, token });
        data.token = token;
        await data.save();
        res.redirect('/login');
    } catch (error) {
        console.log(error);
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await model.findOne({ email });

        if (!user) {
            res.send('user not find');
        }

        if (password !== user.password) {
            res.send('password does not match');
        }
        req.session.user = user;

        if (user.role === 'seller') {
            res.redirect('/add');
        } 
        if(user.role === 'user'){
            res.redirect('/')
        }
    } catch (error) {
        console.log(error);
    }
});

app.post('/add', upload.single('image'), async (req, res) => {
    try {
        let image = req.file.filename;
        let { name, price } = req.body;

        let data = await new sign({ name, image, price });
        await data.save();
        res.send('product saved successfully ');
    } catch (error) {
        console.log(error);
    }
});

app.get('/', async (req, res) => {
    try {
let page = 1;
if(req.query.page){
    page = req.query.page
}
let  limit = 2;
        let search = req.query.search || ""
        let data = await sign.find({ 
            $or:[
                {name:{$regex:search ,$options:"i"}}
            ]
        }).limit(limit * 1)
        .skip((page - 1) * limit)
        .exec()

        // let count = req.query.search || ""
        let count = await sign.find({ 
            $or:[
                {name:{$regex:search ,$options:"i"}}
            ]
        }).countDocuments()
        res.render('home', { data: data , totalPage:Math.ceil(count/limit)});
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
});



app.post('/add-to-cart', async (req, res) => {
    try {
        const { productId } = req.body;

        const user = await model.findById(req.session.user._id);

        if (!user) {
            return res.send('User not found');
        }

        const index = user.cart.findIndex(item => item.product.toString() === productId);

        if (index !== -1) {
            user.cart[index].quantity++;
        } else {
            user.cart.push({ product: productId, quantity: 1 }); 
        }

        await user.save();
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/cart',async(req,res)=>{
    try {
        const user = await model.findById(req.session.user._id).populate({
            path:'cart',
            populate:{
                path:'product',
                model:"sign"
            }
        })
        if(!user){
            return res.status(404).send('User not found');
        }
        const cartItems = user.cart
        res.render('cart',{cartItems:cartItems})
    } catch (error) {
        console.log(error);
    }
})


app.post('/increment-quantity',async(req,res)=>{
    const {productId} = req.body;

    const user = await model.findById(req.session.user._id)

    if(!user){
        res.send('user not found ')
    }

    const cart = user.cart.find(item=>item.product.toString() === productId);

    if(!cart){
        res.send('cart not found')
    }

    cart.quantity++
    await user.save()
    res.redirect('/cart')

})

app.post('/decrement-quantity',async(req,res)=>{
    let {productId} = req.body;

    const user = await model.findById(req.session.user._id);

    if(!user){
        res.send('user not found ')
    }

    const cart = user.cart.find(item=>item.product.toString() === productId);

    if(!cart){
        res.send('cart not found ')
    }

    if(cart.quantity > 1){
        cart.quantity--
    }
    await user.save();
    res.redirect('/cart')
})




app.post('/logout',(req,res)=>{
    req.session.destroy(err=>{
        if(err){
            console.log(err);
        }else{
            res.clearCookie('connect.sid');
            res.redirect('/login')
        }
    })
})






app.listen(5000, () => {
    console.log('connect');
});
