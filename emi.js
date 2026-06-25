document.addEventListener('DOMContentLoaded', function () {
  // --- DOM Elements ---
  // Theme
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;

  // Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const applyRatesBtn = document.getElementById('applyRatesBtn');
  const formTabBtn = document.getElementById('formTabBtn');

  // Calculator Inputs
  const loanAmountInput = document.getElementById('loanAmountInput');
  const loanAmountRange = document.getElementById('loanAmountRange');
  const interestRateInput = document.getElementById('interestRateInput');
  const interestRateRange = document.getElementById('interestRateRange');
  const tenureInput = document.getElementById('tenureInput');
  const tenureRange = document.getElementById('tenureRange');
  
  // Tenure Toggle Unit
  const yearsBtn = document.getElementById('yearsBtn');
  const monthsBtn = document.getElementById('monthsBtn');
  const tenureUnitText = document.getElementById('tenureUnitText');
  const tenureLabels = document.getElementById('tenureLabels');
  
  // Metrics Output
  const emiVal = document.getElementById('emiVal');
  const interestVal = document.getElementById('interestVal');
  const totalVal = document.getElementById('totalVal');

  // Amortization Table
  const toggleAmortization = document.getElementById('toggleAmortization');
  const amortizationWrapper = document.getElementById('amortizationWrapper');
  const amortizationBody = document.getElementById('amortizationBody');

  // Form elements
  const form = document.getElementById('loanForm');
  const formName = document.getElementById('formName');
  const formEmail = document.getElementById('formEmail');
  const phoneInput = document.getElementById('formPhone');
  const phoneError = document.getElementById('phoneError');
  const formAddress = document.getElementById('formAddress');
  const formEmi = document.getElementById('formEmi');
  const bankSelect = document.getElementById('bank');
  
  const studentLoanSelect = document.getElementById('student-loan');
  const studentLoanDetails = document.getElementById('student-loan-details');
  const loanBankInput = document.getElementById('loan-bank');
  const loanAmountFormInput = document.getElementById('loan-amount');
  const loanYearInput = document.getElementById('loan-year');
  
  const loanTypeSelect = document.getElementById('loanType');
  const paymentModeSelect = document.getElementById('paymentMode');
  const upiInput = document.getElementById('upi');
  const upiError = document.getElementById('upiError');
  const upiFieldWrapper = document.getElementById('upiFieldWrapper');
  
  const policyLink = document.getElementById('policyLink');
  const declareCheckbox = document.getElementById('declare');
  const submitBtn = document.getElementById('submitBtn');

  // Success Modal
  const successModal = document.getElementById('successModal');
  const modalEmi = document.getElementById('modalEmi');
  const closeModalBtn = document.getElementById('closeModalBtn');

  // --- State Variables ---
  let tenureUnit = 'years'; // 'years' or 'months'
  let emiChart = null;

  // --- Theme Toggle Logic ---
  // Check cached theme selection
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
    updateChartColors();
  });

  // --- Tab Switching Logic ---
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      this.classList.add('active');
      const targetTab = this.getAttribute('data-tab');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // Apply rates to Form button
  applyRatesBtn.addEventListener('click', function() {
    // Switch to Form tab
    formTabBtn.click();
    
    // Populate form elements
    const monthlyEMIVal = calculateEMI();
    formEmi.value = formatCurrencyNoSymbol(monthlyEMIVal);
    
    if (studentLoanSelect.value === 'yes') {
      loanAmountFormInput.value = loanAmountInput.value;
    }
    
    // Focus first input
    formName.focus();
    validateForm();
  });

  // --- Calculator Formula & Updates ---
  
  // Tenure unit changes
  yearsBtn.addEventListener('click', function() {
    if (tenureUnit === 'years') return;
    tenureUnit = 'years';
    this.classList.add('active');
    monthsBtn.classList.remove('active');
    
    // Adjust input & range limits
    tenureUnitText.textContent = 'Yr';
    tenureInput.min = 1;
    tenureInput.max = 30;
    tenureRange.min = 1;
    tenureRange.max = 30;
    
    // Scale value: months -> years
    const currentVal = Math.max(1, Math.min(30, Math.round(parseInt(tenureInput.value) / 12)));
    tenureInput.value = currentVal;
    tenureRange.value = currentVal;
    
    tenureLabels.innerHTML = '<span>1 Yr</span><span>15 Yr</span><span>30 Yr</span>';
    
    updateCalculator();
  });

  monthsBtn.addEventListener('click', function() {
    if (tenureUnit === 'months') return;
    tenureUnit = 'months';
    this.classList.add('active');
    yearsBtn.classList.remove('active');
    
    // Adjust input & range limits
    tenureUnitText.textContent = 'Mo';
    tenureInput.min = 1;
    tenureInput.max = 360;
    tenureRange.min = 1;
    tenureRange.max = 360;
    
    // Scale value: years -> months
    const currentVal = Math.max(1, Math.min(360, parseInt(tenureInput.value) * 12));
    tenureInput.value = currentVal;
    tenureRange.value = currentVal;
    
    tenureLabels.innerHTML = '<span>1 Mo</span><span>180 Mo</span><span>360 Mo</span>';
    
    updateCalculator();
  });

  // Synchronize Range Sliders & Inputs
  function setupInputSync(inputEl, rangeEl, updateCallback) {
    inputEl.addEventListener('input', function() {
      let val = parseFloat(this.value);
      const min = parseFloat(this.min);
      const max = parseFloat(this.max);
      
      if (isNaN(val)) val = min;
      if (val < min) val = min;
      if (val > max) val = max;
      
      rangeEl.value = val;
      updateCallback();
    });

    rangeEl.addEventListener('input', function() {
      inputEl.value = this.value;
      updateCallback();
    });
  }

  setupInputSync(loanAmountInput, loanAmountRange, updateCalculator);
  setupInputSync(interestRateInput, interestRateRange, updateCalculator);
  setupInputSync(tenureInput, tenureRange, updateCalculator);

  // --- Bank Quick Select & Rates mapping ---
  const BANK_RATES = {
    SBI: 8.5,
    HDFC: 8.7,
    ICICI: 8.8,
    Axis: 8.9,
    PNB: 8.6,
    Slice: 14.5,
    mPokket: 22.0,
    KreditBee: 18.0
  };

  const bankBadges = document.querySelectorAll('.bank-badge');

  bankBadges.forEach(badge => {
    badge.addEventListener('click', function() {
      const rate = parseFloat(this.getAttribute('data-rate'));
      const bank = this.getAttribute('data-bank');
      
      // Update inputs
      interestRateInput.value = rate;
      interestRateRange.value = rate;

      // Update active state in UI
      bankBadges.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // Update selected option in Form dropdown as well! (connects calculator -> form!)
      if (bankSelect.querySelector(`option[value="${bank}"]`)) {
        bankSelect.value = bank;
      }

      updateCalculator();
      validateForm();
    });
  });

  // Highlight active badge if interest rate matches
  function syncBankBadgesHighlight(rate) {
    bankBadges.forEach(badge => {
      const badgeRate = parseFloat(badge.getAttribute('data-rate'));
      if (Math.abs(badgeRate - rate) < 0.05) {
        badge.classList.add('active');
      } else {
        badge.classList.remove('active');
      }
    });
  }

  // Hook into input changes to update highlight
  interestRateInput.addEventListener('input', function() {
    syncBankBadgesHighlight(parseFloat(this.value));
  });
  interestRateRange.addEventListener('input', function() {
    syncBankBadgesHighlight(parseFloat(this.value));
  });

  // Formatting helpers
  function formatCurrency(value) {
    return '₹' + Math.round(value).toLocaleString('en-IN');
  }
  
  function formatCurrencyNoSymbol(value) {
    return Math.round(value).toLocaleString('en-IN');
  }

  // Calculate Monthly EMI
  function calculateEMI() {
    const principal = parseFloat(loanAmountInput.value) || 0;
    const annualInterestRate = parseFloat(interestRateInput.value) || 0;
    const tenure = parseFloat(tenureInput.value) || 0;

    if (principal === 0 || annualInterestRate === 0 || tenure === 0) {
      return 0;
    }

    const monthlyInterestRate = (annualInterestRate / 12) / 100;
    const totalMonths = (tenureUnit === 'years') ? (tenure * 12) : tenure;

    const emi = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalMonths)) / 
                (Math.pow(1 + monthlyInterestRate, totalMonths) - 1);
    
    return emi;
  }

  // Update Calculator Metrics and Visuals
  function updateCalculator() {
    const principal = parseFloat(loanAmountInput.value) || 0;
    const tenure = parseFloat(tenureInput.value) || 0;
    const totalMonths = (tenureUnit === 'years') ? (tenure * 12) : tenure;

    const emi = calculateEMI();
    
    let totalPayment = 0;
    let totalInterest = 0;

    if (emi > 0) {
      totalPayment = emi * totalMonths;
      totalInterest = totalPayment - principal;
    }

    // Display updates
    emiVal.textContent = emi > 0 ? formatCurrency(emi) : '₹0';
    interestVal.textContent = totalInterest > 0 ? formatCurrency(totalInterest) : '₹0';
    totalVal.textContent = totalPayment > 0 ? formatCurrency(totalPayment) : '₹0';

    // Update Chart
    updateChart(principal, totalInterest);

    // Update Amortization schedule if visible
    if (amortizationWrapper.style.display !== 'none') {
      generateAmortizationSchedule(principal, totalMonths, emi);
    }
  }

  // --- Chart.js Doughnut Chart implementation ---
  function initChart() {
    const ctx = document.getElementById('emiChart').getContext('2d');
    
    const isDark = body.classList.contains('dark-theme');
    const labelColor = isDark ? '#9ca3af' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    emiChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Principal Amount', 'Total Interest'],
        datasets: [{
          data: [1000000, 230000], // initial state
          backgroundColor: [
            '#6366f1', // Indigo primary
            '#14b8a6'  // Teal secondary
          ],
          borderColor: isDark ? '#141827' : '#ffffff',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: labelColor,
              font: {
                family: 'Plus Jakarta Sans',
                weight: '500',
                size: 12
              },
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let value = context.raw;
                return ' ' + context.label + ': ' + formatCurrency(value);
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  function updateChart(principal, interest) {
    if (!emiChart) return;
    
    // Avoid drawing zero datasets
    const chartPrincipal = principal > 0 ? principal : 1;
    const chartInterest = interest > 0 ? interest : 0;
    
    emiChart.data.datasets[0].data = [chartPrincipal, chartInterest];
    emiChart.update();
  }

  function updateChartColors() {
    if (!emiChart) return;
    const isDark = body.classList.contains('dark-theme');
    const labelColor = isDark ? '#9ca3af' : '#64748b';
    const borderColor = isDark ? '#141827' : '#ffffff';

    emiChart.options.plugins.legend.labels.color = labelColor;
    emiChart.data.datasets[0].borderColor = borderColor;
    emiChart.update();
  }

  // --- Amortization Schedule Implementation ---
  toggleAmortization.addEventListener('click', function() {
    const isHidden = amortizationWrapper.style.display === 'none';
    
    if (isHidden) {
      amortizationWrapper.style.display = 'block';
      this.textContent = 'Hide Amortization Details';
      
      const principal = parseFloat(loanAmountInput.value) || 0;
      const tenure = parseFloat(tenureInput.value) || 0;
      const totalMonths = (tenureUnit === 'years') ? (tenure * 12) : tenure;
      const emi = calculateEMI();
      
      generateAmortizationSchedule(principal, totalMonths, emi);
    } else {
      amortizationWrapper.style.display = 'none';
      this.textContent = 'Show Amortization Details';
    }
  });

  function generateAmortizationSchedule(principal, totalMonths, emi) {
    amortizationBody.innerHTML = '';
    
    if (principal <= 0 || emi <= 0 || totalMonths <= 0) {
      amortizationBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Enter valid loan parameters to view schedule.</td></tr>`;
      return;
    }

    const annualInterestRate = parseFloat(interestRateInput.value) || 0;
    const monthlyInterestRate = (annualInterestRate / 12) / 100;
    
    let balance = principal;
    
    for (let month = 1; month <= totalMonths; month++) {
      const interestPaid = balance * monthlyInterestRate;
      let principalPaid = emi - interestPaid;
      
      // Safety bounds check for last month rounding errors
      if (balance - principalPaid < 0 || month === totalMonths) {
        principalPaid = balance;
      }
      
      const endingBalance = balance - principalPaid;
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>Month ${month}</td>
        <td>${formatCurrency(balance)}</td>
        <td>${formatCurrency(emi)}</td>
        <td>${formatCurrency(principalPaid)}</td>
        <td>${formatCurrency(interestPaid)}</td>
        <td>${formatCurrency(Math.max(0, endingBalance))}</td>
      `;
      
      amortizationBody.appendChild(row);
      balance = endingBalance;
      
      if (balance <= 0) break;
    }
  }

  // --- Form Validation and Logic ---
  
  // Initial conditional flags
  loanBankInput.required = false;
  loanAmountFormInput.required = false;
  loanYearInput.required = false;
  upiError.style.display = 'none';
  upiFieldWrapper.style.display = 'none';

  // Toggle display of student loan details
  studentLoanSelect.addEventListener('change', function() {
    const shouldShow = this.value === 'yes';
    studentLoanDetails.style.display = shouldShow ? 'block' : 'none';
    loanBankInput.required = shouldShow;
    loanAmountFormInput.required = shouldShow;
    loanYearInput.required = shouldShow;
    
    if (shouldShow && !loanAmountFormInput.value) {
      loanAmountFormInput.value = loanAmountInput.value;
    }
    
    validateForm();
  });

  // Toggle UPI field based on payment mode
  paymentModeSelect.addEventListener('change', function() {
    const isUPIMode = this.value === 'upi';
    upiFieldWrapper.style.display = isUPIMode ? 'flex' : 'none';
    upiInput.required = isUPIMode;
    upiError.style.display = 'none';
    validateForm();
  });

  // Update calculator when bank is selected in the form
  bankSelect.addEventListener('change', function() {
    const selectedBank = this.value;
    if (selectedBank && BANK_RATES[selectedBank]) {
      const rate = BANK_RATES[selectedBank];
      
      // Update calculator inputs
      interestRateInput.value = rate;
      interestRateRange.value = rate;
      
      // Update badges highlights
      syncBankBadgesHighlight(rate);
      
      // Re-calculate
      updateCalculator();
      
      // Autofill Expected EMI in form
      const computedEmi = calculateEMI();
      formEmi.value = formatCurrencyNoSymbol(computedEmi);
      
      // Visual feedback: briefly highlight the auto-filled EMI input
      formEmi.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
      formEmi.parentElement.style.borderColor = 'var(--primary)';
      setTimeout(() => {
        formEmi.parentElement.style.borderColor = 'var(--input-border)';
      }, 1000);
    }
  });

  // Real-time UPI checks
  upiInput.addEventListener('input', function() {
    const isUPIMode = paymentModeSelect.value === 'upi';
    const isValid = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(this.value.trim());
    
    if (isUPIMode && this.value.trim().length > 0 && !isValid) {
      upiError.style.display = 'block';
    } else {
      upiError.style.display = 'none';
    }
    validateForm();
  });

  // Real-time Phone validation
  phoneInput.addEventListener('input', function() {
    const val = this.value.trim();
    const isValid = /^[6-9]\d{9}$/.test(val);
    
    if (val.length > 0 && !isValid) {
      phoneError.style.display = 'block';
      this.setCustomValidity("Enter a valid 10-digit Indian phone number");
    } else {
      phoneError.style.display = 'none';
      this.setCustomValidity("");
    }
    validateForm();
  });

  // Negative amount checks
  loanAmountFormInput.addEventListener('input', function() {
    const val = parseFloat(this.value);
    const isValid = !this.value || val >= 0;
    this.setCustomValidity(isValid ? "" : "Loan amount cannot be negative");
    validateForm();
  });

  // Loan Year limit bounds
  loanYearInput.addEventListener('input', function() {
    const currentYear = new Date().getFullYear();
    const year = this.value ? parseInt(this.value) : null;
    const isValid = !year || (year >= 2000 && year <= currentYear);
    
    this.setCustomValidity(isValid ? "" : `Year must be between 2000 and ${currentYear}`);
    validateForm();
  });

  // Unlock policy checkbox upon link read
  policyLink.addEventListener('click', function(e) {
    declareCheckbox.disabled = false;
    // Policy will open in a new tab via target="_blank"
    validateForm();
  });

  declareCheckbox.addEventListener('change', validateForm);

  // Form Validation Master Function
  function validateForm() {
    const isNameValid = !!formName.value.trim();
    const isEmailValid = !!formEmail.value.trim() && formEmail.checkValidity();
    const isPhoneValid = /^[6-9]\d{9}$/.test(phoneInput.value.trim());
    const isDeclared = declareCheckbox.checked;
    const isBankValid = !!bankSelect.value;
    const isLoanTypeValid = !!loanTypeSelect.value;
    const isPaymentModeValid = !!paymentModeSelect.value;
    
    let isStudentLoanValid = true;
    if (studentLoanSelect.value === 'yes') {
      const currentYear = new Date().getFullYear();
      const year = loanYearInput.value ? parseInt(loanYearInput.value) : null;
      isStudentLoanValid = !!loanBankInput.value.trim() && 
                           !!loanAmountFormInput.value && 
                           (parseFloat(loanAmountFormInput.value) >= 0) &&
                           !!year && (year >= 2000 && year <= currentYear);
    } else {
      isStudentLoanValid = !!studentLoanSelect.value; // Must select either Yes or No
    }
    
    const isUPIValid = paymentModeSelect.value !== 'upi' || 
                      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upiInput.value.trim());

    // Submit button activation state
    const allValid = isNameValid && 
                     isEmailValid &&
                     isPhoneValid &&
                     isDeclared &&
                     isBankValid &&
                     isLoanTypeValid &&
                     isPaymentModeValid &&
                     isStudentLoanValid &&
                     isUPIValid;

    submitBtn.disabled = !allValid;
  }

  // Trigger form validation on inputs
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', validateForm);
    el.addEventListener('change', validateForm);
  });

  // Form Submission Mocking
  form.addEventListener('submit', function(e) {
    e.preventDefault(); // Stop normal Vercel HTTP post

    if (submitBtn.disabled) {
      alert("Please fill all required fields correctly.");
      return;
    }

    // Capture values for modal display
    const computedEmi = calculateEMI();
    const formattedEmi = computedEmi > 0 ? formatCurrency(computedEmi) : (formEmi.value ? '₹' + formEmi.value : '₹0');
    modalEmi.textContent = formattedEmi;

    // Create a new lead record
    const emiCleanVal = formEmi.value ? parseFloat(formEmi.value.replace(/,/g, '')) : (computedEmi > 0 ? Math.round(computedEmi) : 0);
    const lead = {
      id: 'LNM-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: formName.value.trim(),
      email: formEmail.value.trim(),
      phone: phoneInput.value.trim(),
      address: formAddress.value.trim() || 'N/A',
      emi: emiCleanVal,
      bank: bankSelect.value,
      hasStudentLoan: studentLoanSelect.value,
      studentLoanBank: loanBankInput.value.trim() || 'N/A',
      studentLoanAmount: loanAmountFormInput.value ? parseFloat(loanAmountFormInput.value) : 0,
      studentLoanYear: loanYearInput.value ? parseInt(loanYearInput.value) : 0,
      loanType: loanTypeSelect.value,
      paymentMode: paymentModeSelect.value,
      upiId: upiInput.value.trim() || 'N/A',
      status: 'Pending',
      reward: 0, // Assigned when paid
      date: new Date().toISOString()
    };

    // Save to backend database
    fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lead)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Show Success Modal
        successModal.classList.add('active');
      } else {
        alert("Error saving application to database: " + data.message);
      }
    })
    .catch(error => {
      console.error('Error submitting form:', error);
      alert("Network error: Failed to connect to server database.");
    });
  });

  // Close Modal Action
  closeModalBtn.addEventListener('click', function() {
    successModal.classList.remove('active');
    form.reset();
    
    // Reset state dependencies
    studentLoanDetails.style.display = 'none';
    upiFieldWrapper.style.display = 'none';
    declareCheckbox.disabled = true;
    
    validateForm();
  });

  // --- Initial Setup Execution ---
  initChart();
  updateCalculator();
  validateForm();
});
