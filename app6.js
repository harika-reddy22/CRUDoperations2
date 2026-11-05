/*To perform CRUD operations on students table of school db
of MySQL. The students table is with columns sno,name, total
INSTALL: 
>npm install 'mysql8'

Run server:
>node app6.js
IN BROWSER:
1)To list all students
http://localhost:3000/students

2)To list only one student
http://localhost:3000/students/101

3)To inset student details using post man
POST http://localhost:3000/students
IN BODY OF POSTMAN
{"sno" :777,
 "name":"Mr.Seven rao",
 "total":777
}

4)To Update student total
PUT http://localhost:3000/students/101
IN POSTMAN BODY
{
 "total":111
}

5)To delete student with sno 777 using POSTMAN

http://localhost:3000/students/777
*/
const express = require("express");
const mysql = require("mysql2");

const app = express();

// Read JSON data from request body
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "school"
});

db.connect((err) => {
    if (err)
        throw err;

    console.log("Prem! Connected to MySQL Database");
});


// =====================================
// READ ALL STUDENTS
// =====================================

app.get("/students", (req, res) => {

    db.query("SELECT * FROM students", (err, result) => {
        if (err)
            throw err;
        res.json(result);
    });

});


// =====================================
// READ ONE STUDENT
// =====================================

app.get("/students/:sno", (req, res) => {

    db.query(
        "SELECT * FROM students WHERE sno=?",
        [req.params.sno],
        (err, result) => {

            if (err)
                throw err;

            res.json(result);

        });

});


// =====================================
// INSERT STUDENT
// =====================================

app.post("/students", (req, res) => {

    const { sno, name, total } = req.body;

    db.query(
        "INSERT INTO students VALUES(?,?,?)",
        [sno, name, total],
        (err) => {

            if (err)
                throw err;

            res.send("Student Inserted Successfully");

        });

});


// =====================================
// UPDATE STUDENT
// =====================================

app.put("/students/:sno", (req, res) => {

    const { total } = req.body;

    db.query(
        "UPDATE students SET total=? WHERE sno=?",
        [total, req.params.sno],
        (err, result) => {

            if (err)
                throw err;

            if (result.affectedRows == 0)
                res.send("Student Not Found");
            else
                res.send("Student Updated Successfully");

        });

});


// =====================================
// DELETE STUDENT
// =====================================

app.delete("/students/:sno", (req, res) => {

    db.query(
        "DELETE FROM students WHERE sno=?",
        [req.params.sno],
        (err, result) => {

            if (err)
                throw err;

            if (result.affectedRows == 0)
                res.send("Student Not Found");
            else
                res.send("Student Deleted Successfully");

        });

});


// =====================================

app.listen(3000, () => {

    console.log("Server Running at http://localhost:3000");

});