const m = require('mithril')
const {zFill} = require('../js/utils/misc')

const {InputField, validateFieldSet, serializeFieldSet} = require('../js/utils/forms')

function firstDayInPreviousMonth() {
    const now = new Date()
    const fday = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return fday.getFullYear() + '-' + zFill(fday.getMonth() + 1) + '-' + zFill(fday.getDate())
}

function lastDayInPreviousMonth() {
    const now = new Date()
    now.setDate(0);
    return now.getFullYear() + '-' + zFill(now.getMonth() + 1) + '-' + zFill(now.getDate())
}

function secondsToHMS(tsecs) {
    let hours = Math.floor(tsecs / 3600);
    tsecs %= 3600;
    let minutes = Math.floor(tsecs / 60);
    let seconds = tsecs % 60;
    return zFill(hours) + ':' + zFill(minutes) + ':' + zFill(seconds)
}

const VMSTool = {}

VMSTool.oninit = function () {
    const self = this
    self.fieldSet = {}
    self.error = {message: '', details: ''}
    self.isLoading = false
    self.cdr = []
    self.totals = {
        totalDuration: 0,
        totalAmount: 0
    }
    self.defaults = JSON.parse(localStorage.getItem('vmstool.defaults')) || {}
    self.doconv = self.defaults.doconv || false
    self.convrate = 1

    self.runReport = function () {
        if (validateFieldSet(self.fieldSet)) {
            let fields = serializeFieldSet(self.fieldSet)
            self.isLoading = true
            self.error.message = ''
            self.error.details = ''
            self.totals.totalDuration = 0
            self.totals.totalAmount = 0
            self.cdr = []
            m.request({
                method: 'POST',
                url: '/api/vmstool.getCDR',
                data: fields
            }).then((res) => {
                self.isLoading = false
                self.cdr = res.data.cdr.map((o) => {
                    let dur = parseInt(o.seconds)
                    let amt = parseFloat(o.total)
                    self.totals.totalDuration += dur
                    self.totals.totalAmount += amt
                    return {
                        callerid: o.callerid,
                        date: o.date,
                        duration: o.duration,
                        amount: amt,
                        id: o.uniqueid
                    }
                })
            }).catch((err) => {
                self.isLoading = false
                self.error.message = 'An error occured while trying to fetch the data. Please check your internet connection and the data you\'ve entered and try again.'
                self.error.details = err.message || err
                console.error(err)
            })
        }
    }

    self.saveFields = function () {
        let fields = serializeFieldSet(self.fieldSet)
        self.defaults.acctemail = fields.acctemail
        self.defaults.acctphone = fields.acctphone
        self.defaults.convrate = fields.convrate
        self.defaults.doconv = self.doconv
        localStorage.setItem('vmstool.defaults', JSON.stringify(self.defaults))
    }
}

VMSTool.view = function () {
    const self = this
    return m('.container', [
        m('.row.align-items-center.mt-2.d-print-none', [
            m('.col-auto', m('img', {src: '/assets/img/logojfdtr.png'})),
            m('.col', [
                m('h2.mb-0', 'VMSTool by Jean-François Desrochers'),
                m('p', 'Obtain detailed call reports for a specific VOIP.MS Number.')
            ])
        ]),
        m('.jumbotron.d-print-none.py-4.px-3', m('.row', [
            m('.col-sm', [
                m('p.lead', 'Account information'),
                m(InputField, {
                    name: 'acctemail',
                    label: 'Account email',
                    fieldSet: self.fieldSet,
                    defaultValue: self.defaults.acctemail || '',
                    regEx: /^([A-Z|a-z|0-9](\.|_){0,1})+[A-Z|a-z|0-9]\@([A-Z|a-z|0-9])+((\.){0,1}[A-Z|a-z|0-9]){2}\.[a-z]{2,3}$/,
                    helpText: 'Your VOIP.MS account email',
                    errorText: 'Please enter a valid email address.',
                    autofocus: true,
                    disabled: self.isLoading,
                    onChange: self.saveFields
                }),
                m(InputField, {
                    name: 'acctpass',
                    label: 'Account password',
                    type: 'password',
                    fieldSet: self.fieldSet,
                    defaultValue: '',
                    regEx: /^.+$/,
                    helpText: 'Your VOIP.MS account password',
                    errorText: 'Please enter a password.',
                    disabled: self.isLoading
                }),
                m(InputField, {
                    name: 'acctphone',
                    label: 'Account phone number',
                    fieldSet: self.fieldSet,
                    defaultValue: self.defaults.acctphone || '',
                    regEx: /^[(]?(\d{3})[)]?\s?-?\s?(\d{3})\s?-?\s?(\d{4})$/,
                    filter: '$1$2$3',
                    helpText: 'Phone number for which to generate the report.',
                    errorText: 'Please enter a valid phone number. (e.g.: (555) 555-2345)',
                    disabled: self.isLoading,
                    onChange: self.saveFields
                })
            ]),
            m('.col-sm', [
                m('p.lead', 'Report timeframe'),
                m(InputField, {
                    name: 'datefrom',
                    label: 'From date',
                    fieldSet: self.fieldSet,
                    defaultValue: firstDayInPreviousMonth(),
                    regEx: /^((?:19|20)\d\d)[- /.]?(0[1-9]|1[0-2])[- /.]?(0[1-9]|[12][0-9]|3[01])$/,
                    filter: function (s, rEx) {
                        return s.replace(rEx, '$1-$2-$3');
                    },
                    disabled: self.isLoading,
                    helpText: '(yyyy-mm-dd)',
                    errorText: 'Please enter a valid date (yyyy-mm-dd).'
                }),
                m(InputField, {
                    name: 'dateto',
                    label: 'To date',
                    fieldSet: self.fieldSet,
                    defaultValue: lastDayInPreviousMonth(),
                    regEx: /^((?:19|20)\d\d)[- /.]?(0[1-9]|1[0-2])[- /.]?(0[1-9]|[12][0-9]|3[01])$/,
                    filter: function (s, rEx) {
                        return s.replace(rEx, '$1-$2-$3');
                    },
                    disabled: self.isLoading,
                    helpText: '(yyyy-mm-dd)',
                    errorText: 'Please enter a valid date (yyyy-mm-dd).'
                })
            ]),
            m('.col-sm', [
                m('p.lead', 'Options'),
                m('.form-check.form-group', [
                    m('input.form-check-input#doconv', {
                        name: 'doconv',
                        type: 'checkbox',
                        checked: self.doconv,
                        onclick: m.withAttr('checked', (v) => self.doconv = v),
                        disabled: self.isLoading
                    }),
                    m('label.form-check-label', {'for': 'doconv'}, 'Convert USD to CAD')
                ]),
                m(InputField, {
                    name: 'convrate',
                    label: 'Conversion rate',
                    fieldSet: self.fieldSet,
                    defaultValue: self.defaults.convrate || '',
                    regEx: /^(\d+(\.\d+)?)?$/,
                    filter: function (s) {
                        if (self.doconv && s === '') {
                            return false
                        } else {
                            self.convrate = parseFloat(s)
                            return s
                        }
                    },
                    disabled: !self.doconv || self.isLoading,
                    helpText: 'Value in USD for 1 CAD',
                    errorText: 'Please enter a valid amount in USD for 1 CAD (e.g. 0.77).',
                    onChange: self.saveFields
                }),
                m('button.btn.btn-primary', {onclick: self.runReport, disabled: self.isLoading}, 'Run the report')
            ]),
        ])),
        self.isLoading ? m('.row.justify-content-center.d-print-none', m('.col-8.text-center.font-weight-bold', [
            m('p', 'Your data is loading, please wait for a moment...'),
            m('.progress', m('.progress-bar.progress-bar-striped.progress-bar-animated.bg-info', {style: 'width: 100%;'}))
        ])) : '',
        self.error.message !== '' ? m('.alert.alert-danger', [
            m('h4.alert-heading', 'Error'),
            m('p', self.error.message),
            m('hr'),
            m('p.mb-0.text-muted', self.error.details)
        ]) : '',
        self.cdr.length > 0 ? [
            m('.row', [
                m('.col', [
                    m('h1', 'Detailed call report'),
                    m('p.lead', `Call log for ${self.fieldSet['acctphone'].value.replace(/^[(]?(\d{3})[)]?\s?-?\s?(\d{3})\s?-?\s?(\d{4})$/, '($1) $2-$3')}, starting on ${self.fieldSet['datefrom'].value.replace(/-/g, '/')} and ending on ${self.fieldSet['dateto'].value.replace(/-/g, '/')}`),
                    m('p.font-italic', self.doconv ? `Unless otherwise noted, all figures below have been converted to Canadian dollars. (1 USD = ${self.fieldSet['convrate'].value} CAD)` : 'Unless otherwise noted, all figures below are in US dollars.')
                ]),
                m('.col-auto', m('button.btn.btn-primary.d-print-none', {onclick: () => window.print()}, 'Print'))
            ]),
            m('.row.table-responsive-sm', m('table.table', [
                m('thead.thead-dark', m('tr', [
                    m('th', 'Date'),
                    m('th', 'From'),
                    m('th', 'Duration'),
                    m('th', 'Amount')
                ])),
                m('tbody', [
                    self.cdr.map((o) => {
                        return m('tr', {key: o.uniqueid}, [
                            m('td', o.date),
                            m('td', o.callerid),
                            m('td', o.duration),
                            m('td', '$ ' + (self.doconv ? o.amount / self.convrate : o.amount).toFixed(4))
                        ])
                    }),
                    m('tr.table-light.lead.font-weight-bold', [
                        m('td', {colspan: 2}, 'Total'),
                        m('td', secondsToHMS(self.totals.totalDuration)),
                        m('td', '$ ' + (self.doconv ? self.totals.totalAmount / self.convrate : self.totals.totalAmount).toFixed(4))
                    ])
                ])
            ]))
        ] : ''
    ])
}

module.exports = VMSTool

