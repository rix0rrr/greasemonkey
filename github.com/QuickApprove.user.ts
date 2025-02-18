// ==UserScript==
// @name         QuickApprove
// @namespace    http://rix0r.nl/
// @version      0.0.2
// @description  Quickly Approve GitHub Deployments
// @author       Rico
// @require      http://code.jquery.com/jquery-latest.js
// @match        https://github.com/*
// ==/UserScript==

// GitHub uses HotWire Turbo. This event indicates when the page
// has refreshed. According to the docs <https://turbo.hotwired.dev/reference/events>
// it should fire on real load and on boosted load, but in practice it only seems to
// fire on boosted loads.
document.addEventListener('turbo:load', () => {
  findApprovalLinks();
});

function findApprovalLinks() {
  // Find the bottom-most workflow approval link
  const approvalLinks = $('a[class="Link--secondary"]').filter((_, el) => {
    const href = $(el).attr('href');

    // Is this a link to a gated workflow?
    return Boolean(
      $(el).text().includes('requested')
      && href
      && href.match(/https:\/\/github.com\/.*\/actions\/runs\/\d+\/job\/\d+/));
  }).get();

  const lastLink = approvalLinks[approvalLinks.length - 1];
  if (!lastLink) {
    return;
  }

  const href = $(lastLink).attr('href')!;
  const parent = $(lastLink).closest('div[class="TimelineItem-body"]');

  // Make sure the label still says that it's waiting for approval and not anything else
  if (parent.find('span[title="Deployment Status Label: Waiting"]').length === 0) {
    return;
  }

  const buttonText = 'Quick Approve';

  parent.append($('<button>')
    .text(buttonText)
    .addClass("btn btn-sm float-right")
    .on('click', async (ev) => {
      $(ev.target).text(`⏳ ${buttonText}`).attr('disabled', 'true');
      try {
        await approveWorkflowRun(href);
        $(ev.target).text(`✅ ${buttonText}`)
          .removeClass("Button--danger")
          .addClass("Button--primary");
      } catch (e) {
        console.error(e);
        $(ev.target).text(`❌ ${buttonText}`)
          .removeClass("Button--primary")
          .addClass("Button--danger");
      }
    }));
}

async function approveWorkflowRun(href: string) {
  console.log('Fetching', href);
  const confirmationResponse = await fetch(href);
  const confirmationPage = await confirmationResponse.text();

  // Find the form that has the confirmation token
  const forms = $(confirmationPage).find('form').filter((_, frm) => Boolean($(frm).attr('action')?.endsWith('approve_or_reject'))).get();
  if (forms.length === 0) {
    alert('Could not find form in target page');
    return;
  }

  // Append the form to the page, submit it, then immediately remove it
  const confirmForm = forms[0];

  const formData = collectFormData(confirmForm);

  console.log(confirmForm);
  console.log(formData);

  const postAction = $(confirmForm).attr('action') ?? '';
  console.log('Posting to', postAction, formData);

  const response = await fetch(postAction, {
    method: 'POST',
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(formData),
  });

  console.log(response);
}

/**
 * From an HTML form, collect all data that would be sent to the server as part of a form POST
 */
function collectFormData(form: HTMLElement) {
  const ret: Record<string, string> = {};

  $(form).find('input').each((_, el) => {
    ret[$(el).attr('name') ?? ''] = $(el).val() ?? '';
  });
  $(form).find('button[type="submit"]').each((_, el) => {
    ret[$(el).attr('name') ?? ''] = `${$(el).val() ?? ''}`;
  });

  return ret;
}
