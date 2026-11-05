const mysql = require("mysql8");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "school"
});

db.connect((err) => {
    if (err)
        console.log(err);
    else
        console.log("Connected to MySQL Database");
});

module.exports = db;