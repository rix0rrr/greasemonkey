"use strict";
// ==UserScript==
// @name         QuickApprove
// @namespace    http://rix0r.nl/
// @version      0.0.2
// @description  Quickly Approve GitHub Deployments
// @author       Rico
// @require      http://code.jquery.com/jquery-latest.js
// @match        https://github.com/*
// ==/UserScript==
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        return Boolean($(el).text().includes('requested')
            && href
            && href.match(/https:\/\/github.com\/.*\/actions\/runs\/\d+\/job\/\d+/));
    }).get();
    const lastLink = approvalLinks[approvalLinks.length - 1];
    if (!lastLink) {
        return;
    }
    const href = $(lastLink).attr('href');
    const parent = $(lastLink).closest('div[class="TimelineItem-body"]');
    // Make sure the label still says that it's waiting for approval and not anything else
    if (parent.find('span[title="Deployment Status Label: Waiting"]').length === 0) {
        return;
    }
    const buttonText = 'Quick Approve';
    parent.append($('<button>').text(buttonText).css({
        padding: '0px 5px',
        fontSize: '0.9em',
        background: 'oklch(0.945 0.129 101.54)',
        borderRadius: 5,
        borderWidth: 1,
    }).on('click', (ev) => __awaiter(this, void 0, void 0, function* () {
        $(ev.target).text(`⏳ ${buttonText}`).attr('disabled', 'true');
        try {
            yield approveWorkflowRun(href);
            $(ev.target).text(`✅ ${buttonText}`).css({
                background: 'oklch(0.938 0.127 124.321)',
            });
        }
        catch (e) {
            console.error(e);
            $(ev.target).text(`❌ ${buttonText}`).css({
                background: 'oklch(0.885 0.062 18.334)',
            });
        }
    })));
}
function approveWorkflowRun(href) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log('Fetching', href);
        const confirmationResponse = yield fetch(href);
        const confirmationPage = yield confirmationResponse.text();
        // Find the form that has the confirmation token
        const forms = $(confirmationPage).find('form').filter((_, frm) => { var _a; return Boolean((_a = $(frm).attr('action')) === null || _a === void 0 ? void 0 : _a.endsWith('approve_or_reject')); }).get();
        if (forms.length === 0) {
            alert('Could not find form in target page');
            return;
        }
        // Append the form to the page, submit it, then immediately remove it
        const confirmForm = forms[0];
        const formData = collectFormData(confirmForm);
        console.log(confirmForm);
        console.log(formData);
        const postAction = (_a = $(confirmForm).attr('action')) !== null && _a !== void 0 ? _a : '';
        console.log('Posting to', postAction, formData);
        const response = yield fetch(postAction, {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(formData),
        });
        console.log(response);
    });
}
/**
 * From an HTML form, collect all data that would be sent to the server as part of a form POST
 */
function collectFormData(form) {
    const ret = {};
    $(form).find('input').each((_, el) => {
        var _a, _b;
        ret[(_a = $(el).attr('name')) !== null && _a !== void 0 ? _a : ''] = (_b = $(el).val()) !== null && _b !== void 0 ? _b : '';
    });
    $(form).find('button[type="submit"]').each((_, el) => {
        var _a, _b;
        ret[(_a = $(el).attr('name')) !== null && _a !== void 0 ? _a : ''] = `${(_b = $(el).val()) !== null && _b !== void 0 ? _b : ''}`;
    });
    return ret;
}
