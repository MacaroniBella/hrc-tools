/*!
 * HRC Tools: Member Leakage Calculator
 *
 * Estimates how many member households likely pay a mortgage to another lender.
 * Every rate below comes from a published source and is listed on the tool itself.
 * To update a figure, change it in ASSUMPTIONS only; the page copy reads from here.
 */
(function () {
  'use strict';

  var ASSUMPTIONS = {
    // Share of U.S. households that own their home. Census Housing Vacancy Survey, Q2 2026.
    homeownershipRate: 0.650,
    homeownershipSource: 'U.S. Census Bureau, Housing Vacancies and Homeownership, Q2 2026',
    homeownershipUrl: 'https://www.census.gov/housing/hvs/files/qtr226/Q226press.pdf',

    // Share of owner-occupied homes carrying a mortgage (100% minus 39.4% owned free and clear).
    // Census, American Community Survey 2020-2024 5-year estimates.
    mortgagedShareOfOwners: 0.606,
    mortgagedSource: 'U.S. Census Bureau, American Community Survey 2020–2024 (39.4% of owner-occupied homes are mortgage-free)',
    mortgagedUrl: 'https://www.census.gov/library/stories/2026/01/mortgage-free-homes.html',

    // Members per household. NOT from a published source: HRC to confirm with partner data.
    // A higher number gives a more conservative (smaller) estimate. Visitors can change it.
    membersPerHousehold: 2.0
  };

  var EXAMPLES = { members: 18000, held: 300, loanSize: 250000 };

  function compute(input) {
    var households = input.members / input.perHousehold;
    var ownerHouseholds = households * ASSUMPTIONS.homeownershipRate;
    var mortgagedHouseholds = ownerHouseholds * ASSUMPTIONS.mortgagedShareOfOwners;
    var elsewhere = Math.max(mortgagedHouseholds - input.held, 0);
    var share = mortgagedHouseholds > 0 ? Math.min(input.held / mortgagedHouseholds, 1) : 0;
    var renters = households - ownerHouseholds;
    var balances = isFinite(input.loanSize) && input.loanSize > 0 ? elsewhere * input.loanSize : NaN;
    return {
      households: households,
      mortgagedHouseholds: mortgagedHouseholds,
      elsewhere: elsewhere,
      share: share,
      renters: renters,
      balances: balances
    };
  }

  var CSS = [
    '.inputs{display:flex;flex-direction:column;gap:20px}',
    '.adv{border-top:1px solid var(--line);padding-top:16px}',
    '.adv summary{cursor:pointer;font-family:var(--ui);font-weight:700;font-size:.9rem;color:var(--navy-2)}',
    '.adv .field{margin-top:14px}',
    '.over{font-family:var(--ui);font-size:.86rem;color:var(--on-dark);background:rgba(155,201,76,.14);padding:10px 12px}'
  ].join('');

  function mount(ctx) {
    var u = ctx.utils;
    var id = u.uid('ml');
    var c = ctx.container;

    c.innerHTML =
      '<div class="tool">' +
        '<div class="panel">' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
            '<span class="label">Your credit union</span>' +
            '<p class="intro">Example values are filled in. Replace them with your own numbers.</p>' +
          '</div>' +
          '<div class="inputs">' +
            '<div class="field"><label for="' + id + 'm">Total members</label>' +
              '<input type="text" inputmode="numeric" id="' + id + 'm" value="' + u.fmtNumber(EXAMPLES.members) + '">' +
              '<span class="hint">Individual members, as reported on your call report</span></div>' +
            '<div class="field"><label for="' + id + 'h">First mortgages you hold or service today</label>' +
              '<input type="text" inputmode="numeric" id="' + id + 'h" value="' + u.fmtNumber(EXAMPLES.held) + '">' +
              '<span class="hint">Count of loans, including any you service for others</span></div>' +
            '<div class="field"><label for="' + id + 's">Your average mortgage loan size</label>' +
              '<div class="with-prefix"><span>$</span><input type="text" inputmode="numeric" id="' + id + 's" value="' + u.fmtNumber(EXAMPLES.loanSize) + '"></div>' +
              '<span class="hint">Used only to size the loan volume held elsewhere</span></div>' +
            '<details class="adv"><summary>Adjust the household assumption</summary>' +
              '<div class="field"><label for="' + id + 'p">Members per household</label>' +
                '<input type="text" inputmode="decimal" id="' + id + 'p" value="' + ASSUMPTIONS.membersPerHousehold.toFixed(1) + '">' +
                '<span class="hint">Most credit unions have more than one member in many households. A higher number gives a more conservative estimate.</span></div>' +
            '</details>' +
          '</div>' +
        '</div>' +
        '<div class="panel panel-out locked" aria-live="polite">' +
          '<span class="label">Your estimate</span>' +
          '<div class="headline"><b data-out="elsewhere">0</b>' +
            '<span>member households likely paying a mortgage to another lender</span></div>' +
          '<p class="over" data-out="over" hidden>Your mortgage count is at or above our estimate of mortgaged member households. You may already hold most of your members\' mortgages, or your membership skews toward homeowners.</p>' +
          '<div class="rows">' +
            '<div class="row"><span>Share of your mortgaged member households you serve today</span><b data-out="share">0%</b></div>' +
            '<div class="row"><span>Mortgage volume those households represent, at your average loan size</span><b data-out="balances">$0</b></div>' +
            '<div class="row"><span>Renting member households, your future first-time buyers</span><b data-out="renters">0</b></div>' +
          '</div>' +
          '<div class="lock-note" data-out="lock">' +
            '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="3.5" y="8" width="11" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
            '<span>Get your full analysis below to see the breakdown.</span></div>' +
          '<p class="fine">Estimates use national Census figures and the numbers you enter. Your actual results will differ.</p>' +
        '</div>' +
      '</div>';

    var tool = c.querySelector('.tool');
    var out = c.querySelector('.panel-out');
    var get = function (s) { return c.querySelector('#' + id + s); };
    var o = function (k) { return c.querySelector('[data-out="' + k + '"]'); };
    var last = null;

    function read() {
      var members = u.parseNumber(get('m').value);
      var held = u.parseNumber(get('h').value);
      var loanSize = u.parseNumber(get('s').value);
      var per = u.parseNumber(get('p').value);
      if (!isFinite(per) || per < 1) per = ASSUMPTIONS.membersPerHousehold;
      if (per > 5) per = 5;
      return {
        members: isFinite(members) && members > 0 ? members : 0,
        held: isFinite(held) && held > 0 ? held : 0,
        loanSize: loanSize,
        perHousehold: per
      };
    }

    function render() {
      var input = read();
      var r = compute(input);
      last = { input: input, result: r };
      o('elsewhere').textContent = u.fmtNumber(r.elsewhere);
      o('share').textContent = u.fmtPercent(r.share);
      o('balances').textContent = isFinite(r.balances) ? u.fmtMoney(r.balances) : 'Add loan size';
      o('renters').textContent = u.fmtNumber(r.renters);
      o('over').hidden = !(input.members > 0 && r.elsewhere === 0);
    }

    function reformat(e) {
      var el = e.target;
      var n = u.parseNumber(el.value);
      if (!isFinite(n)) return;
      el.value = el.id === id + 'p' ? n.toFixed(1) : u.fmtNumber(n);
    }

    Array.prototype.forEach.call(c.querySelectorAll('input'), function (el) {
      el.addEventListener('input', render);
      el.addEventListener('blur', reformat);
    });

    var gate = ctx.buildGate({
      eyebrow: 'Your full analysis',
      title: 'See the full breakdown for your credit union.',
      body: 'We\'ll unlock the breakdown here and email you a copy to keep.',
      button: 'Get your full analysis',
      doneTitle: 'Your full analysis is on its way.',
      doneBody: 'Want to walk through it with our team?',
      bookLabel: 'Book a call',
      getResults: function () {
        if (!last) render();
        var i = last.input, r = last.result;
        return {
          hrc_ml_members: Math.round(i.members),
          hrc_ml_mortgages_held: Math.round(i.held),
          hrc_ml_avg_loan_size: isFinite(i.loanSize) ? Math.round(i.loanSize) : '',
          hrc_ml_members_per_household: i.perHousehold,
          hrc_ml_households_elsewhere: Math.round(r.elsewhere),
          hrc_ml_share_served: Math.round(r.share * 100),
          hrc_ml_volume_elsewhere: isFinite(r.balances) ? Math.round(r.balances) : '',
          hrc_ml_renting_households: Math.round(r.renters)
        };
      },
      onUnlocked: function () {
        out.classList.remove('locked');
        o('lock').hidden = true;
      },
      onReset: function () {
        out.classList.add('locked');
        o('lock').hidden = false;
      }
    });
    tool.appendChild(gate);

    var method = document.createElement('details');
    method.className = 'method';
    method.innerHTML =
      '<summary>How this estimate works</summary>' +
      '<div class="body">' +
        '<p>We turn your member count into households, estimate how many of those households own a home with a mortgage, then subtract the mortgages you already hold or service.</p>' +
        '<ul>' +
          '<li><b>Homeownership:</b> ' + u.fmtPercent(ASSUMPTIONS.homeownershipRate, 1) + ' of U.S. households own their home. <a href="' + ASSUMPTIONS.homeownershipUrl + '" target="_blank" rel="noopener">' + u.escapeHtml(ASSUMPTIONS.homeownershipSource) + '</a></li>' +
          '<li><b>Homes with a mortgage:</b> ' + u.fmtPercent(ASSUMPTIONS.mortgagedShareOfOwners, 1) + ' of owner-occupied homes carry a mortgage. <a href="' + ASSUMPTIONS.mortgagedUrl + '" target="_blank" rel="noopener">' + u.escapeHtml(ASSUMPTIONS.mortgagedSource) + '</a></li>' +
          '<li><b>Members per household:</b> ' + ASSUMPTIONS.membersPerHousehold.toFixed(1) + ' by default, and you can change it above. A higher number gives a more conservative estimate.</li>' +
        '</ul>' +
        '<p>These are national averages. Homeownership, the share of homes with a mortgage and household size all vary by market and by membership, so treat the result as a starting point for a conversation, not a measurement.</p>' +
      '</div>';
    tool.appendChild(method);

    render();
  }

  if (window.HRCTools) {
    window.HRCTools.register('member-leakage', { css: CSS, mount: mount, compute: compute, assumptions: ASSUMPTIONS });
  }
})();
