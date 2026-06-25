-- Create Database
CREATE DATABASE IF NOT EXISTS loonemi_db;
USE loonemi_db;

-- Create Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    address VARCHAR(255) DEFAULT 'N/A',
    emi DECIMAL(12, 2) DEFAULT 0.00,
    bank VARCHAR(50) NOT NULL,
    hasStudentLoan VARCHAR(5) NOT NULL,
    studentLoanBank VARCHAR(100) DEFAULT 'N/A',
    studentLoanAmount DECIMAL(12, 2) DEFAULT 0.00,
    studentLoanYear INT DEFAULT 0,
    loanType VARCHAR(20) NOT NULL,
    paymentMode VARCHAR(20) NOT NULL,
    upiId VARCHAR(50) DEFAULT 'N/A',
    status VARCHAR(20) DEFAULT 'Pending',
    reward INT DEFAULT 0,
    transactionId VARCHAR(100) DEFAULT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    paidDate DATETIME DEFAULT NULL
);
