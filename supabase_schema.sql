-- Create Leads Table in Supabase (PostgreSQL)
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT DEFAULT 'N/A',
    emi NUMERIC(12, 2) DEFAULT 0.00,
    bank TEXT NOT NULL,
    "hasStudentLoan" TEXT NOT NULL,
    "studentLoanBank" TEXT DEFAULT 'N/A',
    "studentLoanAmount" NUMERIC(12, 2) DEFAULT 0.00,
    "studentLoanYear" INTEGER DEFAULT 0,
    "loanType" TEXT NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "upiId" TEXT DEFAULT 'N/A',
    status TEXT DEFAULT 'Pending',
    reward INTEGER DEFAULT 0,
    "transactionId" TEXT DEFAULT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    "paidDate" TIMESTAMPTZ DEFAULT NULL
);

-- Enable public read and write access for testing (Disable Row-Level Security RLS)
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
