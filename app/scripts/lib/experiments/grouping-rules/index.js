/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Interface to experiment choices.
 */

define(function(require, exports, module) {
  'use strict';

  const _ = require('underscore');

  const ExperimentGroupingRules = [
    require('./communication-prefs'),
    require('./email-first'),
    require('./is-sampled-user'),
    require('./q3-form-changes'),
    require('./send-sms-install-link'),
    require('./sentry'),
    require('./sessions'),
    require('./token-code')
  ];

  module.exports = class ExperimentChoiceIndex {
    constructor (options = {}) {
      this._env = options.env;
      this._experimentGroupingRules = options.experimentGroupingRules || ExperimentGroupingRules.map((ExperimentChoice) => new ExperimentChoice());
    }

    /**
     * Use `subject` to make a choice for the experiment with `name`.
     *
     * @param {String} name
     * @param {Object} [subject={}]
     * @returns {Any}
     */
    choose (name, subject = {}) {
      const experiment = _.find(this._experimentGroupingRules, (experimentGroupingRule) => experimentGroupingRule.name === name);
      if (experiment) {
        if (! isExperimentAllowed(experiment, subject)) {
          return false;
        } else if (useForceExperimentGroup(experiment, subject)) {
          return subject.forceExperimentGroup;
        }

        // A reference to `experimentGroupingRules` is passed in
        // `subject` to allow tests to recursively call other tests.
        // Passing via the `subject` instead of the constructor
        // avoids creating a circular reference between the parent
        // and the children.
        // A copy of subject is used so the original isn't modified.
        const subjectCopy = Object.create(subject);
        subjectCopy.env = subject.env || this._env;
        subjectCopy.experimentGroupingRules = this;
        return experiment.choose(subjectCopy);
      }
    }
  };

  function isExperimentAllowed(experiment, subject) {
    // Functional tests use the forceExperiment & forceExperimentGroup query parameters
    // to force entry into a given experiment. When forcing a given experiment,
    // functional tests do not expect interference from other functional tests.
    // If forceExperiment and forceExperimentGroup are specified, *only* enter the
    // user into the experiment whose name matches forceExperimentGroup. Ignore
    // all other experiments unless they are explicitly allowed.
    return ! subject.forceExperiment ||
             allowExperimentWithForceExperiment(experiment, subject.forceExperiment);
  }

  function allowExperimentWithForceExperiment(experiment, forceExperiment) {
    return forceExperiment === experiment.name ||
           forceExperiment === experiment.forceExperimentAllow;
  }

  function useForceExperimentGroup (experiment, subject) {
    return subject.forceExperiment &&
           subject.forceExperimentGroup &&
           subject.forceExperiment === experiment.name;
  }
});
