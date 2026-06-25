# 💸 Loonemi — Premium Loan EMI Calculator & Cashback Referral Dashboard

Loonemi is a high-performance, full-stack financial dashboard designed to simplify loan amortization calculations, capture qualified financial leads, and reward users with direct cashbacks upon application submission. 

Built with premium aesthetics, rich interactive charts, and a secure multi-layer database architecture, Loonemi bridges the gap between customer loan calculation and administrative audit management.

🔗 **Live Application URL:** [https://loanoffer.onrender.com](https://loanoffer.onrender.com)

---

## 🌟 Key Features

### 1. 📊 Interactive EMI Calculator Dashboard
- **Real-Time Visualizations:** Dynamic sliders for Loan Amount, Interest Rate, and Tenure instantly update a premium donut chart powered by **Chart.js**.
- **Amortization Schedule:** Generates a detailed month-by-month or year-by-year payment schedule mapping principal, interest, and remaining balance.
- **Bank Rate Comparisons:** Quick-select cards to compare interest rates of major banks (SBI, HDFC, ICICI, Axis) with instant auto-apply actions.

### 2. 🎁 Get Cashback on Form Submission
- **Referral Rewards Program:** Submit your loan application details to qualify for instant referral rewards (up to ₹30 cashback directly to your UPI ID).
- **24-Hour Payout Guarantee:** Cashback referral rewards are reviewed, processed, and received by users within **24 hours** of submission!
- **Previous Student Loan Detection:** Intelligent conditional logic detects previous student loans and configures custom refinancing options.
- **Secure Verification:** Simple, validated checkout form requesting address, phone number, and payout details (UPI / Auto Debit).

### 3. 🛡️ Secure Admin Audit Portal
- **Gmail & Password Gate:** Securely locked to a dedicated administrator email (`eslavathnarasimhanaik@gmail.com`) with a server-verified password wall.
- **Payout Management Ledger:** Admins can inspect reference IDs, track pending referrals, log bank transaction IDs, and authorize cashback reward transfers.
- **Data Export:** Instant download of leads data as structured JSON files for local offline audits.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS3, Javascript (ES6+) | Premium UI layout, dark/light themes, animations |
| **Charts** | Chart.js (CDN) | Interactive principal vs. interest breakdown |
| **Icons** | FontAwesome 6.4 | Modern visual cues and typography |
| **Backend** | Node.js, Express | API routing and static asset delivery |
| **Primary Database** | **Supabase Cloud (PostgreSQL)** | Persistent cloud storage for leads |
| **Proxy Gateway** | **Cloudflare Workers** | Custom transparent reverse proxy bypassing regional ISP DNS blocks |
| **Fallback Database**| Local MySQL / In-Memory Mock Cache | Automatically kicks in if cloud services are offline |

---

## 📦 Database Fallback Architecture
To ensure **100% uptime**, the backend is designed with a resilient connection hierarchy:
1. **Supabase Cloud (Via Proxy)**: Primary secure database.
2. **Local MySQL Database**: Fallback database (automatically sets up table `leads` in `loonemi_db`).
3. **In-Memory Cache**: Zero-dependency fallback caching (guarantees the app operates perfectly even without database connections).

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js** (v18+)
- **NPM** (v9+)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/eslavathnarasimhanaik/loanoffer.git
   cd loanoffer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` file in the root directory:
   ```env
   PORT=3000
   ADMIN_PASSWORD=naik123
   SUPABASE_URL=https://your-supabase-proxy.workers.dev
   SUPABASE_KEY=your-supabase-service-role-key-here
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser and navigate to:
   - **Customer Portal:** `http://localhost:3000`
   - **Admin Portal:** `http://localhost:3000/admin.html`

---

## 🔒 Security Best Practices
- **Environment Isolation:** Do not commit your secret credentials or API keys. Always keep them in your ignored `.env` file.
- **Row-Level Security (RLS):** Enable RLS on the Supabase `leads` table. Use an `INSERT`-only public policy on the table, and restrict reads, updates, and deletes to backend servers utilizing the `service_role` secret key.

---

## 👤 Author
**Eslavath Narasimha Naik**
*Spring Boot Java Developer & Full-Stack Engineer*
- **LinkedIn:** [eslavathnarasimhanaik](https://www.linkedin.com/in/eslavathnarasimhanaik)
- **GitHub:** [eslavathnarasimhanaik](https://github.com/eslavathnarasimhanaik)
- **Website:** [naikaa.me](https://naikaa.me/)
