document.addEventListener('DOMContentLoaded', function() {
  // --- DOM Elements ---
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;

  // Authentication Elements
  const loginWallSection = document.getElementById('loginWallSection');
  const adminDashboardContent = document.getElementById('adminDashboardContent');
  const logoutBtn = document.getElementById('logoutBtn');
  const authAlert = document.getElementById('authAlert');
  const loginForm = document.getElementById('loginForm');
  const adminEmail = document.getElementById('adminEmail');
  const adminPassword = document.getElementById('adminPassword');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');

  // Stats Counters
  const statTotalLeads = document.getElementById('statTotalLeads');
  const statPendingCount = document.getElementById('statPendingCount');
  const statEstPendingAmt = document.getElementById('statEstPendingAmt');
  const statPaidAmt = document.getElementById('statPaidAmt');
  const statPaidCount = document.getElementById('statPaidCount');
  const statDisqualified = document.getElementById('statDisqualified');

  // Actions
  const adminSearchInput = document.getElementById('adminSearchInput');
  const generateMockBtn = document.getElementById('generateMockBtn');
  const exportJSONBtn = document.getElementById('exportJSONBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  
  // Filters
  const filterPills = document.querySelectorAll('.filter-pill');
  
  // Table
  const leadsTableBody = document.getElementById('leadsTableBody');
  const emptyState = document.getElementById('emptyState');
  const leadsTableSection = document.getElementById('leadsTableSection');

  // Modals
  const payoutModal = document.getElementById('payoutModal');
  const payoutName = document.getElementById('payoutName');
  const payoutForm = document.getElementById('payoutForm');
  const rewardAmount = document.getElementById('rewardAmount');
  const transactionId = document.getElementById('transactionId');
  const cancelPayoutBtn = document.getElementById('cancelPayoutBtn');

  const detailsModal = document.getElementById('detailsModal');
  const detailsContent = document.getElementById('detailsContent');
  const closeDetailsBtn = document.getElementById('closeDetailsBtn');

  // --- Global State ---
  let leads = [];
  let activeFilter = 'all';
  let activeSearch = '';
  let selectedLeadId = null;

  // --- Theme Toggle ---
  const cachedTheme = localStorage.getItem('theme');
  if (cachedTheme === 'light') {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
  }

  themeToggle.addEventListener('click', function() {
    if (body.classList.contains('dark-theme')) {
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    }
  });

  // --- Authentication Gate Logic ---
  
  // Check session token on startup
  function checkSessionAuth() {
    const token = sessionStorage.getItem('admin_token');
    if (token) {
      // Authenticated state
      loginWallSection.style.display = 'none';
      adminDashboardContent.style.display = 'block';
      logoutBtn.style.display = 'flex';
      fetchLeadsFromServer();
    } else {
      // Unauthenticated state
      loginWallSection.style.display = 'block';
      adminDashboardContent.style.display = 'none';
      logoutBtn.style.display = 'none';
    }
  }

  // Helper to show auth alert messages
  function showAlert(msg, type = 'error') {
    authAlert.textContent = msg;
    authAlert.className = `auth-alert ${type}`;
    authAlert.style.display = 'block';
  }

  function hideAlert() {
    authAlert.style.display = 'none';
  }

  // Login Form Submission
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const email = adminEmail.value.trim();
    const password = adminPassword.value;

    if (!email || !password) {
      showAlert('Email and password are required.');
      return;
    }

    hideAlert();
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.innerHTML = 'Signing In... <i class="fa-solid fa-spinner fa-spin"></i>';

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.innerHTML = 'Login & Enter Panel <i class="fa-solid fa-right-to-bracket" style="margin-left: 6px;"></i>';

      if (status === 200 && data.success) {
        // Save session token
        sessionStorage.setItem('admin_token', data.token);
        sessionStorage.setItem('admin_email', email);
        
        // Refresh view
        checkSessionAuth();
      } else {
        showAlert(data.message || 'Login failed. Invalid password.');
      }
    })
    .catch(err => {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.innerHTML = 'Login & Enter Panel <i class="fa-solid fa-right-to-bracket" style="margin-left: 6px;"></i>';
      console.error('[Auth Error] Login request failed:', err);
      showAlert('Network error: Authentication server is unreachable.');
    });
  });

  // 4. Logout trigger
  logoutBtn.addEventListener('click', function() {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_email');
    window.location.reload();
  });

  // Helper: Get authorization header config
  function getHeaders() {
    const token = sessionStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Helper: Handle unauthorized responses
  function handleApiError(res) {
    if (res.status === 401) {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_email');
      window.location.reload();
      return true;
    }
    return false;
  }

  // --- API Fetch Function ---
  function fetchLeadsFromServer() {
    const url = `/api/leads?status=${activeFilter}&search=${encodeURIComponent(activeSearch)}`;
    
    fetch(url, {
      headers: getHeaders()
    })
      .then(res => {
        if (handleApiError(res)) return;
        if (!res.ok) throw new Error('API request failed');
        return res.json();
      })
      .then(data => {
        if (!data) return; // session expired
        leads = data;
        calculateMetrics();
        renderLeads();
      })
      .catch(error => {
        console.error('[API Error] Fetch failed:', error);
      });
  }

  // --- Calculations & Updates ---
  function calculateMetrics() {
    fetch('/api/leads?status=all', {
      headers: getHeaders()
    })
      .then(res => {
        if (handleApiError(res)) return;
        return res.json();
      })
      .then(allLeads => {
        if (!allLeads) return;
        const total = allLeads.length;
        const pending = allLeads.filter(l => l.status === 'Pending').length;
        const paidLeads = allLeads.filter(l => l.status === 'Paid');
        const paidCount = paidLeads.length;
        const disqualified = allLeads.filter(l => l.status === 'Disqualified').length;
        
        // Sum rewards
        const totalPaidVal = paidLeads.reduce((sum, current) => sum + (parseFloat(current.reward) || 0), 0);
        const estPendingVal = pending * 15;

        // Set text
        statTotalLeads.textContent = total;
        statPendingCount.textContent = pending;
        statEstPendingAmt.textContent = `Est: ₹${estPendingVal.toLocaleString('en-IN')}`;
        statPaidAmt.textContent = `₹${totalPaidVal.toLocaleString('en-IN')}`;
        statPaidCount.textContent = `${paidCount} payouts`;
        statDisqualified.textContent = disqualified;
      })
      .catch(err => console.error('[API Stats Error]', err));
  }

  function formatCurrency(value) {
    return '₹' + Math.round(value).toLocaleString('en-IN');
  }

  function formatDate(isoString) {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // --- Render Table ---
  function renderLeads() {
    leadsTableBody.innerHTML = '';
    
    if (leads.length === 0) {
      emptyState.style.display = 'block';
      leadsTableSection.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    leadsTableSection.style.display = 'block';

    leads.forEach(lead => {
      const tr = document.createElement('tr');
      
      // Status badge class
      let badgeClass = 'badge-pending';
      if (lead.status === 'Paid') badgeClass = 'badge-paid';
      if (lead.status === 'Disqualified') badgeClass = 'badge-disqualified';

      // Reward Text
      const rewardText = lead.status === 'Paid' 
        ? `<span class="reward-payout-text">${formatCurrency(lead.reward)}</span>` 
        : `<span class="reward-payout-text empty">-</span>`;

      // Expected EMI formatting
      const emiFormatted = lead.emi > 0 ? formatCurrency(lead.emi) : 'Custom/Blank';

      tr.innerHTML = `
        <td style="font-size: 12px; color: var(--text-muted); min-width: 110px;">${formatDate(lead.date)}</td>
        <td>
          <div class="info-name">${lead.name}</div>
          <div class="info-details">${lead.email}</div>
        </td>
        <td>
          <div class="calc-emi-tag">${emiFormatted}</div>
          <div class="calc-params">${lead.loanType.toUpperCase()} | ${lead.bank}</div>
        </td>
        <td>
          <div class="verification-list">
            <span><i class="fa-solid fa-phone"></i> ${lead.phone}</span>
            <span><i class="fa-solid fa-credit-card"></i> Mode: ${lead.paymentMode.toUpperCase()}</span>
            ${lead.paymentMode === 'upi' ? `<span><i class="fa-solid fa-at"></i> ${lead.upiId}</span>` : ''}
          </div>
        </td>
        <td>
          <span class="badge ${badgeClass}">${lead.status}</span>
        </td>
        <td>${rewardText}</td>
        <td>
          <div class="row-actions">
            <button class="btn-action-icon view-details-btn" data-id="${lead.id}" title="View Details">
              <i class="fa-solid fa-magnifying-glass"></i>
            </button>
            ${lead.status === 'Pending' || lead.status === 'Disqualified' ? `
              <button class="btn-action-icon color-success pay-btn" data-id="${lead.id}" title="Approve Payment">
                <i class="fa-solid fa-circle-dollar-to-slot"></i>
              </button>
            ` : ''}
            ${lead.status === 'Pending' || lead.status === 'Paid' ? `
              <button class="btn-action-icon color-danger disqualify-btn" data-id="${lead.id}" title="Disqualify Submission">
                <i class="fa-solid fa-ban"></i>
              </button>
            ` : ''}
          </div>
        </td>
      `;

      leadsTableBody.appendChild(tr);
    });

    // Wire up row action button event listeners dynamically
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        openDetailsModal(id);
      });
    });

    document.querySelectorAll('.pay-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        openPayoutModal(id);
      });
    });

    document.querySelectorAll('.disqualify-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        disqualifyLead(id);
      });
    });
  }

  // --- Filtering & Search ---
  filterPills.forEach(pill => {
    pill.addEventListener('click', function() {
      filterPills.forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      activeFilter = this.getAttribute('data-filter');
      fetchLeadsFromServer();
    });
  });

  adminSearchInput.addEventListener('input', function() {
    activeSearch = this.value.trim();
    fetchLeadsFromServer();
  });

  // --- Action Handlers ---

  function disqualifyLead(id) {
    if (!confirm("Are you sure you want to disqualify this submission? It will forfeit any referral reward.")) return;
    
    fetch(`/api/leads/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        status: 'Disqualified',
        reward: 0,
        transactionId: null
      })
    })
    .then(res => {
      if (handleApiError(res)) return;
      return res.json();
    })
    .then(data => {
      if (!data) return;
      if (data.success) {
        fetchLeadsFromServer();
      } else {
        alert("Failed to disqualify lead: " + data.message);
      }
    })
    .catch(error => {
      console.error('[API Error] Disqualification update failed:', error);
      alert("Network error: Failed to update status.");
    });
  }

  function openPayoutModal(id) {
    selectedLeadId = id;
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    payoutName.textContent = lead.name;
    rewardAmount.value = 15; // default suggested
    transactionId.value = 'TXN' + Math.floor(1000000000 + Math.random() * 9000000000); // generate placeholder txn id
    
    payoutModal.classList.add('active');
  }

  cancelPayoutBtn.addEventListener('click', () => {
    payoutModal.classList.remove('active');
    selectedLeadId = null;
  });

  payoutForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!selectedLeadId) return;

    const rewardVal = parseInt(rewardAmount.value);
    const txn = transactionId.value.trim();

    if (rewardVal < 5 || rewardVal > 30) {
      alert("Reward amount must be between ₹5 and ₹30.");
      return;
    }

    fetch(`/api/leads/${selectedLeadId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        status: 'Paid',
        reward: rewardVal,
        transactionId: txn
      })
    })
    .then(res => {
      if (handleApiError(res)) return;
      return res.json();
    })
    .then(data => {
      if (!data) return;
      if (data.success) {
        payoutModal.classList.remove('active');
        selectedLeadId = null;
        fetchLeadsFromServer();
      } else {
        alert("Failed to confirm payout: " + data.message);
      }
    })
    .catch(error => {
      console.error('[API Error] Payout confirmation failed:', error);
      alert("Network error: Failed to update status.");
    });
  });

  function openDetailsModal(id) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    detailsContent.innerHTML = `
      <div class="detail-item">
        <span class="detail-label">Lead Reference ID</span>
        <span class="detail-value" style="color:var(--primary); font-size:12px;">${lead.id}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Date Submitted</span>
        <span class="detail-value">${formatDate(lead.date)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Name</span>
        <span class="detail-value">${lead.name}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Email Address</span>
        <span class="detail-value">${lead.email}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Phone Number</span>
        <span class="detail-value">${lead.phone}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Location Address</span>
        <span class="detail-value">${lead.address}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Expected EMI</span>
        <span class="detail-value" style="color:var(--primary);">${lead.emi > 0 ? formatCurrency(lead.emi) : 'N/A'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Selected Provider Bank</span>
        <span class="detail-value">${lead.bank}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Loan Classification</span>
        <span class="detail-value" style="text-transform: capitalize;">${lead.loanType} Loan</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Payout Mode / UPI</span>
        <span class="detail-value">${lead.paymentMode.toUpperCase()} ${lead.paymentMode === 'upi' ? `(${lead.upiId})` : ''}</span>
      </div>
      
      <div class="detail-item full-width">
        <span class="detail-label">Previous Student Loan Usage</span>
        <span class="detail-value" style="text-transform: uppercase;">${lead.hasStudentLoan}</span>
      </div>
      
      ${lead.hasStudentLoan === 'yes' ? `
        <div class="detail-item">
          <span class="detail-label">Student Loan Bank</span>
          <span class="detail-value">${lead.studentLoanBank}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Student Loan Amount</span>
          <span class="detail-value">${formatCurrency(lead.studentLoanAmount)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Student Loan Year</span>
          <span class="detail-value">${lead.studentLoanYear}</span>
        </div>
      ` : ''}
      
      <div class="detail-item">
        <span class="detail-label">Verification Status</span>
        <span class="detail-value">${lead.status}</span>
      </div>
      ${lead.status === 'Paid' ? `
        <div class="detail-item">
          <span class="detail-label">Paid Reward Cash</span>
          <span class="detail-value" style="color:var(--success);">${formatCurrency(lead.reward)}</span>
        </div>
        <div class="detail-item full-width">
          <span class="detail-label">Bank Transaction Reference ID</span>
          <span class="detail-value" style="color:var(--success);">${lead.transactionId || 'N/A'}</span>
        </div>
      ` : ''}
    `;

    detailsModal.classList.add('active');
  }

  closeDetailsBtn.addEventListener('click', () => {
    detailsModal.classList.remove('active');
  });

  // --- Utility Actions ---

  // Generate 5 Sample Mock Entries via API POST
  generateMockBtn.addEventListener('click', function() {
    const mockNames = [
      'Rahul Kumar Sharma', 'Priya Deshmukh', 'Eslavath Narasimha Naik', 
      'Ananya Reddy', 'Vikram Malhotra', 'Siddharth Sen', 'Kavitha Rao'
    ];
    const mockEmails = [
      'rahul.sharma99@gmail.com', 'priyadesh@yahoo.com', 'narasimha.naik99@gmail.com',
      'ananyareddy@outlook.com', 'vikram.malhotra@gmail.com', 'sid.sen@gmail.com', 'kavitha.r@gmail.com'
    ];
    const mockPhones = [
      '9876543210', '8765432109', '7654321098', '6543210987', '9988776655', '8877665544', '7766554433'
    ];
    const mockAddresses = [
      'Kothagudem, Telangana', 'Hyderabad, Telangana', 'Bangalore, Karnataka', 
      'Secunderabad, Telangana', 'Mumbai, Maharashtra', 'Kolkata, West Bengal', 'Chennai, Tamil Nadu'
    ];
    const mockBanks = ['SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'KreditBee', 'mPokket'];
    const mockLoanTypes = ['home', 'personal', 'education'];
    const mockPaymentModes = ['upi', 'auto_debit', 'ecs', 'cheque', 'netbanking'];
    const mockUpiSuffix = ['@ybl', '@paytm', '@okaxis', '@oksbi', '@apl'];

    const newMockLeads = [];
    const count = 5;

    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * mockNames.length);
      const name = mockNames[idx];
      const email = mockEmails[idx];
      const phone = mockPhones[idx];
      const address = mockAddresses[idx];
      const bank = mockBanks[Math.floor(Math.random() * mockBanks.length)];
      const loanType = mockLoanTypes[Math.floor(Math.random() * mockLoanTypes.length)];
      const paymentMode = mockPaymentModes[Math.floor(Math.random() * mockPaymentModes.length)];
      
      const hasStudentLoan = Math.random() > 0.5 ? 'yes' : 'no';
      const studentLoanBank = hasStudentLoan === 'yes' ? mockBanks[Math.floor(Math.random() * mockBanks.length)] : 'N/A';
      const studentLoanAmount = hasStudentLoan === 'yes' ? Math.floor(50000 + Math.random() * 250000) : 0;
      const studentLoanYear = hasStudentLoan === 'yes' ? Math.floor(2020 + Math.random() * 6) : 0;

      const upiId = paymentMode === 'upi' 
        ? name.toLowerCase().split(' ')[0] + mockUpiSuffix[Math.floor(Math.random() * mockUpiSuffix.length)]
        : 'N/A';
      
      const emiVal = Math.floor(5000 + Math.random() * 45000);
      
      const daysAgo = Math.floor(Math.random() * 7);
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      const rand = Math.random();
      let status = 'Pending';
      let reward = 0;
      let txnId = '';
      if (rand > 0.6) {
        status = 'Paid';
        reward = Math.floor(5 + Math.random() * 26);
        txnId = 'TXN' + Math.floor(1000000000 + Math.random() * 9000000000);
      } else if (rand > 0.85) {
        status = 'Disqualified';
      }

      newMockLeads.push({
        id: 'LNM-' + (Date.now() - i * 1000) + '-' + Math.floor(Math.random() * 1000),
        name,
        email,
        phone,
        address,
        emi: emiVal,
        bank,
        hasStudentLoan,
        studentLoanBank,
        studentLoanAmount,
        studentLoanYear,
        loanType,
        paymentMode,
        upiId,
        status,
        reward,
        transactionId: txnId,
        date
      });
    }

    fetch('/api/leads/mock', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ leads: newMockLeads })
    })
    .then(res => {
      if (handleApiError(res)) return;
      return res.json();
    })
    .then(data => {
      if (!data) return;
      if (data.success) {
        fetchLeadsFromServer();
      } else {
        alert("Mock generation failed: " + data.message);
      }
    })
    .catch(error => {
      console.error('[API Error] Mock injection request failed:', error);
      alert("Network error: Could not generate mock leads.");
    });
  });

  // Export JSON
  exportJSONBtn.addEventListener('click', function() {
    if (leads.length === 0) {
      alert("No leads available to export.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "loonemi_leads.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Clear Database via DELETE API
  clearAllBtn.addEventListener('click', function() {
    if (leads.length === 0) {
      alert("Database is already empty.");
      return;
    }
    
    if (confirm("🚨 WARNING: Are you sure you want to completely erase the leads database? This action cannot be undone.")) {
      fetch('/api/leads', {
        method: 'DELETE',
        headers: getHeaders()
      })
      .then(res => {
        if (handleApiError(res)) return;
        return res.json();
      })
      .then(data => {
        if (!data) return;
        if (data.success) {
          fetchLeadsFromServer();
        } else {
          alert("Failed to clear database: " + data.message);
        }
      })
      .catch(error => {
        console.error('[API Error] Clear database request failed:', error);
        alert("Network error: Failed to clear records.");
      });
    }
  });

  // --- Initial Setup Execution ---
  checkSessionAuth();
});
