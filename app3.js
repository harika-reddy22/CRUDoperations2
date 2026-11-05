const express = require("express");
const app=express();
app.get("/",(req,res)=>{
  console.log("Hello World");
  res.send("Hello Students!check the terminal console.")
});
app.listen(3000,()=>{
    console.log("Server Running");
});