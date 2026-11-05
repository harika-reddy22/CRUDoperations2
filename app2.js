const express =require("express");
const app =express();
app.get("/",(req,res)=>{
    res.send("<h1>Home page</h1>");
});
app.get("/about",(req,res)=>{
    res.send("<h1>About Us</h1>");
});
app.get("/contact",(req,res)=>{
    res.send("<h1>Contact us</h1>");
});
app.listen(3000,()=>{
    console.log("Server Started");
});