const mysql = require("mysql");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root123",
    database: "strahms_db"
});

connection.connect(function(err){
    if(err){
        console.log("Database connection failed");
    } else {
        console.log("Connected to MySQL");
    }
});

module.exports = connection;