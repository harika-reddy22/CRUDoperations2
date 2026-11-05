
/*
    HARIKA SCHOLARSPACE
    Student Management System

    Backend: Node.js + Express + MySQL
    Database: schools
    Table: std

    Run: node app7.js
    Open: http://localhost:3000
*/

const express = require("express");
const mysql = require("mysql8");
const path = require("path");

const app = express();
const PORT = 3000;

// ======================================
// MIDDLEWARE
// ======================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve files from public folder
app.use(express.static(path.join(__dirname, "public")));

// ======================================
// MYSQL CONNECTION
// ======================================

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "schools"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL Connection Error:", err.message);
        return;
    }

    console.log("Connected to MySQL successfully!");
});

// ======================================
// DATABASE ERROR HANDLER
// ======================================

function handleError(res, err) {
    console.error("MYSQL ERROR CODE:", err.code);
    console.error("MYSQL ERROR MESSAGE:", err.sqlMessage);
    console.error("MYSQL SQL:", err.sql);

    if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "Student ID already exists. Use another ID."
        });
    }

    if (err.code === "ER_DATA_TOO_LONG" ||
        err.code === "ER_WARN_DATA_OUT_OF_RANGE") {
        return res.status(400).json({
            success: false,
            message: "One or more values exceed the database column limits."
        });
    }

    return res.status(500).json({
        success: false,
        message: "Database operation failed. Check the server terminal."
    });
}

// ======================================
// 1. GET ALL STUDENTS
// GET /std
// Supports search, class filter, sorting
// ======================================

app.get("/std", (req, res) => {

    const { search, studentClass, sort } = req.query;

    let sql = "SELECT * FROM `std` WHERE 1=1";
    const values = [];

    // Search by name or student ID
    if (typeof search === "string" && search.trim()) {
        sql += `
            AND (
                \`student_name\` LIKE ?
                OR CAST(\`student_id\` AS CHAR) LIKE ?
            )
        `;

        const keyword = `%${search.trim()}%`;
        values.push(keyword, keyword);
    }

    // Filter by class
    if (studentClass !== undefined &&
        String(studentClass).trim() !== "") {

        sql += " AND `class` = ?";
        values.push(studentClass);
    }

    // Sort records
    const sortOptions = {
        id: "`student_id` ASC",
        name: "`student_name` ASC",
        marks: "`total` DESC"
    };

    sql += " ORDER BY " +
        (sortOptions[sort] || sortOptions.id);

    db.query(sql, values, (err, results) => {
        if (err) return handleError(res, err);

        res.json(results);
    });
});

// ======================================
// 2. GET DISTINCT CLASSES
// GET /classes
// ======================================

app.get("/classes", (req, res) => {

    const sql = `
        SELECT DISTINCT \`class\`
        FROM \`std\`
        ORDER BY \`class\` ASC
    `;

    db.query(sql, (err, results) => {
        if (err) return handleError(res, err);

        const classes = results.map(row => row.class);

        res.json(classes);
    });
});

// ======================================
// 3. GET ONE STUDENT
// GET /std/:sno
// ======================================

app.get("/std/:sno", (req, res) => {

    const sno = req.params.sno;

    const sql = `
        SELECT *
        FROM \`std\`
        WHERE \`student_id\` = ?
    `;

    db.query(sql, [sno], (err, results) => {
        if (err) return handleError(res, err);

        // Return an array to match your frontend
        res.json(results);
    });
});

// ======================================
// 4. INSERT STUDENT
// POST /std
// ======================================

app.post("/std", (req, res) => {

    const {
        sno,
        name,
        studentClass,
        total,
        age,
        phnno
    } = req.body;

    // Check required fields
    if (
        sno == null || String(sno).trim() === "" ||
        !name || !String(name).trim() ||
        studentClass == null ||
        String(studentClass).trim() === "" ||
        total == null || String(total).trim() === "" ||
        age == null || String(age).trim() === "" ||
        phnno == null || String(phnno).trim() === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "Please fill in all student details."
        });
    }

    // Validate values
    if (
        !Number.isSafeInteger(Number(sno)) ||
        Number(sno) <= 0 ||
        !Number.isInteger(Number(studentClass)) ||
        Number(studentClass) < 1 ||
        Number(studentClass) > 12 ||
        !Number.isFinite(Number(total)) ||
        Number(total) < 0 ||
        !Number.isInteger(Number(age)) ||
        Number(age) < 1 ||
        Number(age) > 120 ||
        !/^[0-9]{10}$/.test(String(phnno))
    ) {
        return res.status(400).json({
            success: false,
            message: "Please enter valid student details."
        });
    }

    // Corrected SQL INSERT query
    const sql = `
        INSERT INTO \`std\`
        (
            \`student_id\`,
            \`student_name\`,
            \`class\`,
            \`total\`,
            \`age\`,
            \`phnno\`
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
        Number(sno),
        String(name).trim(),
        Number(studentClass),
        Number(total),
        Number(age),
        String(phnno)
    ];

    db.query(sql, values, (err, result) => {

        if (err) return handleError(res, err);

        res.status(201).json({
            success: true,
            message: "Student added successfully!",
            studentId: sno
        });
    });
});

// ======================================
// 5. UPDATE STUDENT
// PUT /std/:sno
// ======================================

app.put("/std/:sno", (req, res) => {

    const sno = req.params.sno;

    const {
        name,
        total,
        age,
        phnno
    } = req.body;

    // Validate input
    if (
        !name || !String(name).trim() ||
        total == null || String(total).trim() === "" ||
        age == null || String(age).trim() === "" ||
        phnno == null || String(phnno).trim() === "" ||
        !Number.isFinite(Number(total)) ||
        Number(total) < 0 ||
        !Number.isInteger(Number(age)) ||
        Number(age) < 1 ||
        Number(age) > 120 ||
        !/^[0-9]{10}$/.test(String(phnno))
    ) {
        return res.status(400).json({
            success: false,
            message: "Please enter valid student details."
        });
    }

    const sql = `
        UPDATE \`std\`
        SET
            \`student_name\` = ?,
            \`total\` = ?,
            \`age\` = ?,
            \`phnno\` = ?
        WHERE \`student_id\` = ?
    `;

    const values = [
        String(name).trim(),
        Number(total),
        Number(age),
        String(phnno),
        sno
    ];

    db.query(sql, values, (err, result) => {

        if (err) return handleError(res, err);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        res.json({
            success: true,
            message: "Student updated successfully!"
        });
    });
});

// ======================================
// 6. DELETE STUDENT
// DELETE /std/:sno
// ======================================

app.delete("/std/:sno", (req, res) => {

    const sno = req.params.sno;

    const sql = `
        DELETE FROM \`std\`
        WHERE \`student_id\` = ?
    `;

    db.query(sql, [sno], (err, result) => {

        if (err) return handleError(res, err);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        res.json({
            success: true,
            message: "Student deleted successfully!"
        });
    });
});

// ======================================
// START SERVER
// ======================================

app.listen(PORT, () => {

    console.log("----------------------------------");
    console.log("       HARIKA SCHOLARSPACE");
    console.log("    Student Management System");
    console.log("----------------------------------");
    console.log(`Server: http://localhost:${PORT}`);
});
