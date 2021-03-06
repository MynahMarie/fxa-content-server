/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * A relier is a model that holds information about the relying party.
 *
 * A subclass should override `resumeTokenFields` to add/modify which
 * fields are saved to and populated from a resume token in the resume
 * query parameter.
 */

define(function (require, exports, module) {
  'use strict';

  const _ = require('underscore');
  const AuthErrors = require('../../lib/auth-errors');
  const BaseRelier = require('./base');
  const Cocktail = require('cocktail');
  const Constants = require('../../lib/constants');
  const ResumeTokenMixin = require('../mixins/resume-token');
  const SearchParamMixin = require('../mixins/search-param');
  const Vat = require('../../lib/vat');

  var RELIER_FIELDS_IN_RESUME_TOKEN = [
    'entrypoint',
    'resetPasswordConfirm',
    'utmCampaign',
    'utmContent',
    'utmMedium',
    'utmSource',
    'utmTerm'
  ];

  /*eslint-disable camelcase*/
  var QUERY_PARAMETER_SCHEMA = {
    email: Vat.email().allow(Constants.DISALLOW_CACHED_CREDENTIALS),
    // FxDesktop declares both `entryPoint` (capital P) and
    // `entrypoint` (lowcase p). Normalize to `entrypoint`.
    entryPoint: Vat.string(),
    entrypoint: Vat.string(),
    migration: Vat.string().valid(Constants.AMO_MIGRATION, Constants.SYNC11_MIGRATION),
    reset_password_confirm: Vat.boolean().renameTo('resetPasswordConfirm'),
    setting: Vat.string(),
    uid: Vat.uid(),
    utm_campaign: Vat.string().renameTo('utmCampaign'),
    utm_content: Vat.string().renameTo('utmContent'),
    utm_medium: Vat.string().renameTo('utmMedium'),
    utm_source: Vat.string().renameTo('utmSource'),
    utm_term: Vat.string().renameTo('utmTerm')
  };

  var VERIFICATION_QUERY_PARAMETER_SCHEMA = _.extend({}, QUERY_PARAMETER_SCHEMA, {
    // Verication links are sometimes broken by mail user-agents.
    // The rules on the following fields are relaxed for startup,
    // and then further validated by the views that use them. If
    // the fields are invalid, context specific help text is displayed
    // that helps the user remedy the problem.
    email: Vat.string().allow(Constants.DISALLOW_CACHED_CREDENTIALS),
    uid: Vat.string()
  });

  /*eslint-enable camelcase*/

  var Relier = BaseRelier.extend({
    defaults: {
      allowCachedCredentials: true,
      // This ensures for non-oauth reliers, SOME context is sent to the auth
      // server to let the auth server know requests come from the content
      // server and not some other service.
      context: Constants.CONTENT_SERVER_CONTEXT,
      email: null,
      entrypoint: null,
      migration: null,
      resetPasswordConfirm: true,
      setting: null,
      uid: null,
      utmCampaign: null,
      utmContent: null,
      utmMedium: null,
      utmSource: null,
      utmTerm: null
    },

    initialize (attributes, options = {}) {
      this._queryParameterSchema = options.isVerification ?
        VERIFICATION_QUERY_PARAMETER_SCHEMA : QUERY_PARAMETER_SCHEMA;

      this.sentryMetrics = options.sentryMetrics;
      this.window = options.window || window;
    },

    /**
     * Hydrate the model. Returns a promise to allow
     * for an asynchronous load. Sub-classes that override
     * fetch should still call Relier's version before completing.
     *
     * e.g.
     *
     * fetch () {
     *   return Relier.prototype.fetch.call(this)
     *       .then(function () {
     *         // do overriding behavior here.
     *       });
     * }
     *
     * @method fetch
     * @returns {Promise}
     */
    fetch () {
      return Promise.resolve().then(() => {
        // parse the resume token before importing any other data.
        // query parameters and server provided data override
        // resume provided data.
        this.populateFromStringifiedResumeToken(this.getSearchParam('resume'));
        // TODO - validate data coming from the resume token

        this.importSearchParamsUsingSchema(this._queryParameterSchema, AuthErrors);

        // FxDesktop declares both `entryPoint` (capital P) and
        // `entrypoint` (lowcase p). Normalize to `entrypoint`.
        if (this.has('entryPoint') && ! this.has('entrypoint')) {
          this.set('entrypoint', this.get('entryPoint'));
        }

        if (this.get('email') === Constants.DISALLOW_CACHED_CREDENTIALS) {
          this.unset('email');
          this.set('allowCachedCredentials', false);
        }
      });
    },

    /**
     * Check if the relier allows cached credentials. A relier
     * can set email=blank to indicate they do not.
     *
     * @returns {Boolean}
     */
    allowCachedCredentials () {
      return this.get('allowCachedCredentials');
    },

    resumeTokenFields: RELIER_FIELDS_IN_RESUME_TOKEN
  });

  Cocktail.mixin(
    Relier,
    ResumeTokenMixin,
    SearchParamMixin
  );

  module.exports = Relier;
});
