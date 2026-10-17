/*!
 * HRC Tools: Member Leakage Calculator
 *
 * Shows what share of members with a mortgage have it with another lender (ungated),
 * then the dollar volume and the first-time buyer pipeline among renting members (gated).
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

    // Share of renter households that buy a first home each year.
    // 2025 home sales (4.061M existing + 679K new = 4.74M) x 21% first-time buyers (NAR 2025 Profile,
    // a record low) = about 995K first-time buyers, divided by 46.8M renter households (Census, Q2 2026)
    // = 2.1%. Conservative: NAR's 21% is the lowest first-time buyer share it has ever recorded.
    firstTimeBuyerRate: 0.021,
    firstTimeBuyerSource: '2025 home sales (NAR existing-home sales and Census new-home sales) × 21% first-time buyers (NAR 2025 Profile of Home Buyers and Sellers) ÷ 46.8 million renter households (Census, Q2 2026)',
    firstTimeBuyerUrl: 'https://www.nar.realtor/magazine/real-estate-news/nar-2025-profile-of-home-buyers-sellers-reveals-market-extremes',
    yearsLow: 3,
    yearsHigh: 5,

    // Members per household. NOT from a published source: HRC to confirm with partner data.
    // A higher number gives a more conservative (smaller) estimate. Visitors can change it.
    membersPerHousehold: 2.0
  };

  var EXAMPLES = { members: 18000, held: 300, loanSize: 250000 };

  function compute(input) {
    var A = ASSUMPTIONS;
    var households = input.members / input.perHousehold;
    var ownerHouseholds = households * A.homeownershipRate;
    var mortgagedHouseholds = ownerHouseholds * A.mortgagedShareOfOwners;
    var elsewhere = Math.max(mortgagedHouseholds - input.held, 0);
    var share = mortgagedHouseholds > 0 ? Math.min(input.held / mortgagedHouseholds, 1) : 0;
    var renters = households - ownerHouseholds;
    var hasLoanSize = isFinite(input.loanSize) && input.loanSize > 0;
    var buyersLow = renters * A.firstTimeBuyerRate * A.yearsLow;
    var buyersHigh = renters * A.firstTimeBuyerRate * A.yearsHigh;
    return {
      households: households,
      mortgagedHouseholds: mortgagedHouseholds,
      elsewhere: elsewhere,
      share: share,
      shareElsewhere: mortgagedHouseholds > 0 ? 1 - share : 0,
      renters: renters,
      volumeElsewhere: hasLoanSize ? elsewhere * input.loanSize : NaN,
      buyersLow: buyersLow,
      buyersHigh: buyersHigh,
      withYouLow: buyersLow * share,
      withYouHigh: buyersHigh * share,
      buyerVolumeLow: hasLoanSize ? buyersLow * input.loanSize : NaN,
      buyerVolumeHigh: hasLoanSize ? buyersHigh * input.loanSize : NaN
    };
  }

  var CSS = [
    '.inputs{display:flex;flex-direction:column;gap:20px}',
    '.adv{border-top:1px solid var(--line);padding-top:16px}',
    '.adv summary{cursor:pointer;font-family:var(--ui);font-weight:700;font-size:.9rem;color:var(--navy-2)}',
    '.adv .field{margin-top:14px}',
    '.sub{font-family:var(--ui);font-size:1rem;color:var(--on-dark)}',
    '.sub b{color:#fff;font-variant-numeric:tabular-nums}',
    '.group{display:flex;flex-direction:column;gap:2px}',
    '.group-title{font-family:var(--ui);font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--lime-bright);padding-top:6px}',
    '.over{font-family:var(--ui);font-size:.86rem;color:var(--on-dark);background:rgba(155,201,76,.14);padding:10px 12px}'
  ].join('');

  function mount(ctx) {
    var u = ctx.utils;
    var A = ASSUMPTIONS;
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
            '<div class="field"><label for="' + id + 'h">First mortgages you hold or service for your members</label>' +
              '<input type="text" inputmode="numeric" id="' + id + 'h" value="' + u.fmtNumber(EXAMPLES.held) + '">' +
              '<span class="hint">Count of loans to your own members only</span></div>' +
            '<div class="field"><label for="' + id + 's">Your average mortgage loan size</label>' +
              '<div class="with-prefix"><span>$</span><input type="text" inputmode="numeric" id="' + id + 's" value="' + u.fmtNumber(EXAMPLES.loanSize) + '"></div>' +
              '<span class="hint">Used only to size loan volume</span></div>' +
            '<details class="adv"><summary>Adjust the household assumption</summary>' +
              '<div class="field"><label for="' + id + 'p">Members per household</label>' +
                '<input type="text" inputmode="decimal" id="' + id + 'p" value="' + A.membersPerHousehold.toFixed(1) + '">' +
                '<span class="hint">Most credit unions have more than one member in many households. A higher number gives a more conservative estimate.</span></div>' +
            '</details>' +
          '</div>' +
        '</div>' +
        '<div class="panel panel-out locked" aria-live="polite">' +
          '<span class="label">Your estimate</span>' +
          '<div class="headline"><b data-out="shareElsewhere">0%</b>' +
            '<span>of your members with a mortgage have it with another lender</span></div>' +
          '<p class="sub">That\'s about <b data-out="elsewhere">0</b> member households.</p>' +
          '<p class="over" data-out="over" hidden>Your mortgage count is at or above our estimate of mortgaged member households. You may already hold most of your members\' mortgages, or your membership skews toward homeowners.</p>' +
          '<div class="group">' +
            '<div class="row"><span>Mortgage volume held by other lenders, at your average loan size</span><b data-out="volumeElsewhere">$0</b></div>' +
          '</div>' +
          '<div class="group">' +
            '<span class="group-title">Your future first-time buyers</span>' +
            '<div class="row"><span>Renting member households likely to buy a first home in the next ' + A.yearsLow + ' to ' + A.yearsHigh + ' years</span><b data-out="buyers">0</b></div>' +
            '<div class="row"><span>Of those, likely to finance with you at today\'s rate</span><b data-out="withYou">0</b></div>' +
            '<div class="row"><span>Mortgage volume those first-time buyers represent</span><b data-out="buyerVolume">$0</b></div>' +
          '</div>' +
          '<div class="lock-note" data-out="lock">' +
            '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="3.5" y="8" width="11" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 8V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
            '<span>Get your full analysis below to see the dollar volume and your first-time buyer pipeline.</span></div>' +
          '<p class="fine">Estimates use national Census and NAR figures and the numbers you enter. Your actual results will differ.</p>' +
        '</div>' +
      '</div>';

    var tool = c.querySelector('.tool');
    var out = c.querySelector('.panel-out');
    var get = function (s) { return c.querySelector('#' + id + s); };
    var o = function (k) { return c.querySelector('[data-out="' + k + '"]'); };
    var last = null;

    function range(lo, hi, fmt) {
      var a = fmt(lo), b = fmt(hi);
      return a === b ? a : a + '–' + b;
    }

    function read() {
      var members = u.parseNumber(get('m').value);
      var held = u.parseNumber(get('h').value);
      var loanSize = u.parseNumber(get('s').value);
      var per = u.parseNumber(get('p').value);
      if (!isFinite(per) || per < 1) per = A.membersPerHousehold;
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
      o('shareElsewhere').textContent = u.fmtPercent(r.shareElsewhere);
      o('elsewhere').textContent = u.fmtNumber(r.elsewhere);
      o('volumeElsewhere').textContent = isFinite(r.volumeElsewhere) ? u.fmtMoney(r.volumeElsewhere) : 'Add loan size';
      o('buyers').textContent = range(r.buyersLow, r.buyersHigh, u.fmtNumber);
      o('withYou').textContent = range(r.withYouLow, r.withYouHigh, u.fmtNumber);
      o('buyerVolume').textContent = isFinite(r.buyerVolumeLow) ? range(r.buyerVolumeLow, r.buyerVolumeHigh, u.fmtMoney) : 'Add loan size';
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

    var round = function (n) { return isFinite(n) ? Math.round(n) : ''; };

    var gate = ctx.buildGate({
      eyebrow: 'Your full analysis',
      title: 'See the dollars and your first-time buyer pipeline.',
      body: 'We\'ll unlock the full breakdown here and email you a copy to keep.',
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
          hrc_ml_avg_loan_size: round(i.loanSize),
          hrc_ml_members_per_household: i.perHousehold,
          hrc_ml_households_elsewhere: Math.round(r.elsewhere),
          hrc_ml_share_elsewhere: Math.round(r.shareElsewhere * 100),
          hrc_ml_volume_elsewhere: round(r.volumeElsewhere),
          hrc_ml_renting_households: Math.round(r.renters),
          hrc_ml_future_buyers_low: Math.round(r.buyersLow),
          hrc_ml_future_buyers_high: Math.round(r.buyersHigh),
          hrc_ml_future_with_you_low: Math.round(r.withYouLow),
          hrc_ml_future_with_you_high: Math.round(r.withYouHigh),
          hrc_ml_future_volume_low: round(r.buyerVolumeLow),
          hrc_ml_future_volume_high: round(r.buyerVolumeHigh)
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
        '<p>We turn your member count into households, estimate how many of those households own a home with a mortgage, then compare that with the mortgages you hold. Renting households are your future first-time buyers.</p>' +
        '<ul>' +
          '<li><b>Homeownership:</b> ' + u.fmtPercent(A.homeownershipRate, 1) + ' of U.S. households own their home. <a href="' + A.homeownershipUrl + '" target="_blank" rel="noopener">' + u.escapeHtml(A.homeownershipSource) + '</a></li>' +
          '<li><b>Homes with a mortgage:</b> ' + u.fmtPercent(A.mortgagedShareOfOwners, 1) + ' of owner-occupied homes carry a mortgage. <a href="' + A.mortgagedUrl + '" target="_blank" rel="noopener">' + u.escapeHtml(A.mortgagedSource) + '</a></li>' +
          '<li><b>First-time buyers:</b> about ' + u.fmtPercent(A.firstTimeBuyerRate, 1) + ' of renter households buy a first home each year, applied over ' + A.yearsLow + ' to ' + A.yearsHigh + ' years. <a href="' + A.firstTimeBuyerUrl + '" target="_blank" rel="noopener">' + u.escapeHtml(A.firstTimeBuyerSource) + '</a>. This is conservative: 21% is the lowest first-time buyer share NAR has recorded.</li>' +
          '<li><b>Financing with you:</b> we assume future buyers choose you at the same rate your current mortgaged members do.</li>' +
          '<li><b>Members per household:</b> ' + A.membersPerHousehold.toFixed(1) + ' by default, and you can change it above. A higher number gives a more conservative estimate.</li>' +
        '</ul>' +
        '<p>These are national averages. Homeownership, the share of homes with a mortgage, home prices and household size all vary by market and by membership, so treat the result as a starting point for a conversation, not a measurement.</p>' +
      '</div>';
    tool.appendChild(method);

    render();
  }

  if (window.HRCTools) {
    window.HRCTools.register('member-leakage', { css: CSS, mount: mount, compute: compute, assumptions: ASSUMPTIONS });
  }
})();
