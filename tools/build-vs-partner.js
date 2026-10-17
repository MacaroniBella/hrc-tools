/*!
 * HRC Tools: Build vs. Partner (in-house mortgage cost calculator)
 *
 * "If you wanted to make X mortgages a year yourself, here's what it would cost."
 * Uses the MBA/STRATMOR retail cost to originate for depositories (banks and credit unions),
 * split into the categories those sources report. No HRC pricing appears anywhere.
 * To update a figure, change it in ASSUMPTIONS only; the page copy reads from here.
 */
(function () {
  'use strict';

  var ASSUMPTIONS = {
    // Retail cost to originate one loan at depositories, 2025. MBA and STRATMOR Peer Group Roundtables.
    costPerLoan: 16320,
    costSource: 'MBA and STRATMOR Peer Group Roundtables, retail channel cost to originate for depositories, 2025',
    costUrl: 'https://newslink.mba.org/mba-newslinks/2026/june/mba-newslink-monday-june-22-2026/chart-of-the-week-retail-production-channel-cost-to-originate-a-loan/',

    // Shares of that cost. Sales 42% and fulfillment 20% are reported for depositories.
    // Technology is about 4% of direct production cost (MBA Quarterly Performance Report data).
    // Support and overhead is the remainder of the 38% corporate and production support share.
    shares: { sales: 0.42, fulfillment: 0.20, technology: 0.04, support: 0.34 },
    techSource: 'Technology is about 4% of direct production cost, MBA Quarterly Performance Report data as analyzed by HousingWire (2026)',
    techUrl: 'https://www.housingwire.com/articles/cost-originate-ai-economics/',

    // Direct cost to service one loan for a year. MBA, 2025.
    servicingPerLoan: 185,
    servicingSource: 'MBA direct servicing cost per loan, 2025',

    // Share of production cost that is staff pay (about two-thirds).
    personnelShare: 0.67,
    personnelSource: 'Freddie Mac, 2024 Cost to Originate Study',
    personnelUrl: 'https://sf.freddiemac.com/docs/pdf/cost-to-originate-full-study-2024.pdf'
  };

  var LINES = [
    { key: 'sales', title: 'Sales and marketing', included: 'Loan officers and commissions, loan officer assistants, marketing, sales office space' },
    { key: 'fulfillment', title: 'Processing, underwriting and closing', included: 'The staff who take a file from application to closing' },
    { key: 'technology', title: 'Technology', included: 'Loan origination system, point-of-sale software and production tools' },
    { key: 'support', title: 'Support and overhead', included: 'Post-closing, quality control, secondary market, credit policy, compliance and corporate overhead' }
  ];

  var EXAMPLE_LOANS = 100;

  function compute(input) {
    var A = ASSUMPTIONS;
    var origination = input.loans * A.costPerLoan;
    var lines = {};
    LINES.forEach(function (l) { lines[l.key] = origination * A.shares[l.key]; });
    var servicing = input.service ? input.loans * A.servicingPerLoan : 0;
    return {
      origination: origination,
      lines: lines,
      servicing: servicing,
      total: origination + servicing,
      monthly: (origination + servicing) / 12,
      personnel: origination * A.personnelShare
    };
  }

  var CSS = [
    '.inputs{display:flex;flex-direction:column;gap:22px}',
    '.big-input input{font-size:1.5rem;font-weight:700;padding:14px 16px;min-height:58px}',
    '.chips{display:flex;flex-wrap:wrap;gap:8px}',
    '.chip{font:inherit;font-family:var(--ui);font-size:.88rem;font-weight:700;padding:8px 14px;border:1.5px solid var(--line);background:var(--ground);color:var(--text);cursor:pointer;border-radius:0}',
    '.chip:hover{border-color:var(--navy)}',
    '.chip[aria-pressed=true]{background:var(--navy);border-color:var(--navy);color:#fff}',
    '.seg{display:flex;flex-wrap:wrap}',
    '.seg button{font:inherit;font-family:var(--ui);font-size:.9rem;font-weight:700;padding:10px 16px;border:1.5px solid var(--line);margin-right:-1.5px;background:var(--ground);color:var(--text);cursor:pointer;border-radius:0}',
    '.seg button[aria-pressed=true]{background:var(--navy);border-color:var(--navy);color:#fff;position:relative}',
    '.sub{font-family:var(--ui);font-size:1rem;color:var(--on-dark)}',
    '.sub b{color:#fff;font-variant-numeric:tabular-nums}',
    '.line{padding:14px 0;border-top:1px solid var(--on-dark-line);display:flex;flex-direction:column;gap:8px}',
    '.line-top{display:flex;justify-content:space-between;align-items:baseline;gap:16px}',
    '.line-top span{color:#fff;font-family:var(--ui);font-weight:700;font-size:.95rem}',
    '.line-top b{font-family:var(--display);font-size:clamp(1.2rem,2.4vw,1.5rem);font-weight:800;color:#fff;white-space:nowrap;font-variant-numeric:tabular-nums;transition:filter .35s ease}',
    '.line small{color:var(--on-dark-muted);font-size:.85rem;line-height:1.45}',
    '.bar{height:6px;background:rgba(238,243,246,.12)}',
    '.bar i{display:block;height:100%;background:var(--lime-bright)}',
    '.locked .line-top b{filter:blur(8px);user-select:none}',
    '.locked .bar i{filter:blur(3px)}',
    '.total{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding-top:14px;border-top:2px solid var(--on-dark)}',
    '.total span{font-family:var(--ui);font-weight:700;color:#fff}',
    '.total b{font-family:var(--display);font-size:clamp(1.4rem,2.8vw,1.8rem);font-weight:800;color:var(--lime-bright);font-variant-numeric:tabular-nums;transition:filter .35s ease}',
    '.callout{background:var(--lime-bright);color:#10240A;padding:18px 20px;display:flex;flex-direction:column;gap:6px}',
    '.callout strong{font-family:var(--display);font-size:1.2rem;line-height:1.25}',
    '.callout span{font-size:.95rem}'
  ].join('');

  function mount(ctx) {
    var u = ctx.utils;
    var A = ASSUMPTIONS;
    var id = u.uid('bp');
    var c = ctx.container;
    var state = { loans: EXAMPLE_LOANS, service: true };

    c.innerHTML =
      '<div class="tool">' +
        '<div class="panel">' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
            '<span class="label">Your mortgage goal</span>' +
            '<p class="intro">Tell us how many mortgages you\'d like to make in a year. We\'ll show what it would cost to run that program yourself.</p>' +
          '</div>' +
          '<div class="inputs">' +
            '<div class="field big-input"><label for="' + id + 'l">Mortgages per year</label>' +
              '<input type="text" inputmode="numeric" id="' + id + 'l" value="' + u.fmtNumber(EXAMPLE_LOANS) + '">' +
              '<div class="chips" role="group" aria-label="Quick picks">' +
                [25, 50, 100, 250, 500].map(function (n) {
                  return '<button type="button" class="chip" data-pick="' + n + '" aria-pressed="' + (n === EXAMPLE_LOANS) + '">' + n + '</button>';
                }).join('') +
              '</div></div>' +
            '<div class="field"><span class="label" style="color:var(--text);letter-spacing:0;text-transform:none;font-size:.9rem" id="' + id + 'sv">Would you service these loans yourself?</span>' +
              '<div class="seg" role="group" aria-labelledby="' + id + 'sv">' +
                '<button type="button" data-service="yes" aria-pressed="true">Yes, we\'d service them</button>' +
                '<button type="button" data-service="no" aria-pressed="false">No, we\'d sell them</button>' +
              '</div>' +
              '<span class="hint">Servicing means collecting payments, managing escrow and answering borrower calls for as long as you keep the loan.</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="panel panel-out locked" aria-live="polite">' +
          '<span class="label">Estimated cost to do it yourself</span>' +
          '<div class="headline"><b data-out="total">$0</b>' +
            '<span data-out="headline-text">a year to make 100 mortgages in-house</span></div>' +
          '<p class="sub">That\'s about <b data-out="monthly">$0</b> a month, before your first loan earns a dollar.</p>' +
          '<div data-out="lines"></div>' +
          '<div class="line" data-out="servicing-line">' +
            '<div class="line-top"><span>Servicing</span><b data-out="servicing">$0</b></div>' +
            '<small>Payments, escrow and borrower support for the loans you make this year. It grows every year your portfolio does.</small>' +
          '</div>' +
          '<div class="total"><span>Total yearly cost</span><b data-out="total2">$0</b></div>' +
          '<div class="lock-note" data-out="lock">' +
            '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="3.5" y="8" width="11" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
            '<span>Get the full breakdown below to see where every dollar goes.</span></div>' +
          '<div class="callout" data-out="callout" hidden>' +
            '<strong>HRC runs all of this for a fraction of the cost.</strong>' +
            '<span>Same loans, under your credit union\'s name, without building the team. Ask us for your real numbers.</span>' +
          '</div>' +
          '<p class="fine">Based on national benchmarks for banks and credit unions. Your actual costs will differ.</p>' +
        '</div>' +
      '</div>';

    var tool = c.querySelector('.tool');
    var out = c.querySelector('.panel-out');
    var o = function (k) { return c.querySelector('[data-out="' + k + '"]'); };
    var loansInput = c.querySelector('#' + id + 'l');
    var last = null;

    o('lines').innerHTML = LINES.map(function (l) {
      return '<div class="line">' +
        '<div class="line-top"><span>' + u.escapeHtml(l.title) + '</span><b data-line="' + l.key + '">$0</b></div>' +
        '<div class="bar" aria-hidden="true"><i style="width:' + Math.round(A.shares[l.key] / 0.42 * 100) + '%"></i></div>' +
        '<small>' + u.escapeHtml(l.included) + '</small>' +
      '</div>';
    }).join('');

    function render() {
      var n = u.parseNumber(loansInput.value);
      state.loans = isFinite(n) && n > 0 ? Math.min(Math.round(n), 100000) : 0;
      var r = compute(state);
      last = { input: { loans: state.loans, service: state.service }, result: r };
      o('total').textContent = u.fmtMoney(r.total);
      o('total2').textContent = u.fmtMoney(r.total);
      o('monthly').textContent = u.fmtMoney(r.monthly);
      o('headline-text').textContent = 'a year to make ' + u.fmtNumber(state.loans) + (state.loans === 1 ? ' mortgage' : ' mortgages') + ' in-house';
      LINES.forEach(function (l) {
        c.querySelector('[data-line="' + l.key + '"]').textContent = u.fmtMoney(r.lines[l.key]);
      });
      o('servicing').textContent = u.fmtMoney(r.servicing);
      o('servicing-line').hidden = !state.service;
      Array.prototype.forEach.call(c.querySelectorAll('[data-pick]'), function (b) {
        b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-pick')) === state.loans));
      });
    }

    loansInput.addEventListener('input', render);
    loansInput.addEventListener('blur', function () {
      var n = u.parseNumber(loansInput.value);
      if (isFinite(n)) loansInput.value = u.fmtNumber(n);
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-pick]'), function (b) {
      b.addEventListener('click', function () {
        loansInput.value = u.fmtNumber(Number(b.getAttribute('data-pick')));
        render();
      });
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-service]'), function (b) {
      b.addEventListener('click', function () {
        state.service = b.getAttribute('data-service') === 'yes';
        Array.prototype.forEach.call(c.querySelectorAll('[data-service]'), function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        render();
      });
    });

    var round = function (v) { return Math.round(v); };

    var gate = ctx.buildGate({
      eyebrow: 'The full breakdown',
      title: 'See where every dollar goes.',
      body: 'We\'ll unlock the line-by-line breakdown here and email you a copy. Then let\'s talk about what it costs when HRC runs it for you.',
      button: 'Show me the breakdown',
      doneTitle: 'Your breakdown is on its way.',
      doneBody: 'HRC runs every line on this list for a fraction of the cost, under your credit union\'s name. Get your real numbers from our team.',
      bookLabel: 'Get your real numbers',
      getResults: function () {
        if (!last) render();
        var i = last.input, r = last.result;
        return {
          hrc_bvp_loans_per_year: i.loans,
          hrc_bvp_service_in_house: i.service ? 'true' : 'false',
          hrc_bvp_total_cost: round(r.total),
          hrc_bvp_origination_cost: round(r.origination),
          hrc_bvp_sales_cost: round(r.lines.sales),
          hrc_bvp_fulfillment_cost: round(r.lines.fulfillment),
          hrc_bvp_technology_cost: round(r.lines.technology),
          hrc_bvp_support_cost: round(r.lines.support),
          hrc_bvp_servicing_cost: round(r.servicing)
        };
      },
      onUnlocked: function () {
        out.classList.remove('locked');
        o('lock').hidden = true;
        o('callout').hidden = false;
      },
      onReset: function () {
        out.classList.add('locked');
        o('lock').hidden = false;
        o('callout').hidden = true;
      }
    });
    tool.appendChild(gate);

    var method = document.createElement('details');
    method.className = 'method';
    method.innerHTML =
      '<summary>How this estimate works</summary>' +
      '<div class="body">' +
        '<p>We multiply the mortgages you want to make by what it costs banks and credit unions to originate one loan, then split that cost into the categories the industry reports.</p>' +
        '<ul>' +
          '<li><b>Cost per loan:</b> ' + u.fmtMoney(A.costPerLoan) + ', fully loaded. <a href="' + A.costUrl + '" target="_blank" rel="noopener">' + u.escapeHtml(A.costSource) + '</a></li>' +
          '<li><b>Line items:</b> sales and marketing ' + u.fmtPercent(A.shares.sales) + ' and processing, underwriting and closing ' + u.fmtPercent(A.shares.fulfillment) + ' come from the same source. Technology is about ' + u.fmtPercent(A.shares.technology) + ' (<a href="' + A.techUrl + '" target="_blank" rel="noopener">' + u.escapeHtml(A.techSource) + '</a>). Support and overhead is the rest of the corporate and production support share.</li>' +
          '<li><b>Servicing:</b> ' + u.fmtMoney(A.servicingPerLoan) + ' per loan per year (' + u.escapeHtml(A.servicingSource) + '), shown for the loans made in one year.</li>' +
          '<li><b>People:</b> about two-thirds of the cost to originate is staff pay (<a href="' + A.personnelUrl + '" target="_blank" rel="noopener">' + u.escapeHtml(A.personnelSource) + '</a>).</li>' +
        '</ul>' +
        '<p>These benchmarks come from lenders larger than most community credit unions. A smaller program still needs a full team and a loan system, so its cost per loan is often higher than shown here. Loan sales and servicing income are not included.</p>' +
      '</div>';
    tool.appendChild(method);

    render();
  }

  if (window.HRCTools) {
    window.HRCTools.register('build-vs-partner', { css: CSS, mount: mount, compute: compute, assumptions: ASSUMPTIONS });
  }
})();
