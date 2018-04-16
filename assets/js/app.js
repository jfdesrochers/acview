const m = require('mithril')
const Papa = require('papaparse')

function setLoading (isLoading, ldMessage) {
    const ldblock = document.getElementById('loading')
    const ldtext = document.getElementById('loadingtext')
    if (isLoading) {
        if (ldMessage) {
            ldtext.textContent = ldMessage
        }
        ldblock.classList.add('visible')
    } else {
        ldblock.classList.remove('visible')
    }
}

const ACView = {}

ACView.oninit = function () {
    const self = this
    self.isLoading = false
    self.files = {
        permcsv: {default: 'Click to browse for Permissions CSV...', file: undefined},
        usercsv: {default: 'Click to browse for Users CSV...', file: undefined}
    }
    self.onfilechange = function (e) {
        const files = e.target.files
        const field = e.target.id
        if (files.length > 0) {
            self.files[field].file = files[0]
        } else {
            self.files[field].file = undefined
        }
    }
}

ACView.view = function () {
    const self = this
    return m(`.jumbotron.appwindow${!self.isLoading && '.visible'}`, [
        m('.text-center', [
            m('h1.apptitle', 'ACView'),
            m('h4.appsubtitle', 'by Jean-François Desrochers'),
            m('h3.titletext', 'Access Control Viewer'),
        ]),
        m('.custom-file.csvbrowser.mb-2', [
            m('input.custom-file-input#permcsv', {type: 'file', onchange: self.onfilechange}),
            m('label.custom-file-label', {for: 'permcsv'}, self.files.permcsv.file ? self.files.permcsv.file.name : self.files.permcsv.default)
        ]),
        m('.custom-file.csvbrowser.mb-3', [
            m('input.custom-file-input#usercsv', {type: 'file', onchange: self.onfilechange}),
            m('label.custom-file-label', {for: 'usercsv'}, self.files.usercsv.file ? self.files.usercsv.file.name : self.files.usercsv.default)
        ]),
        m('.text-center', [
            m('button.btn.btn-primary', {disabled: !(self.files.permcsv.file && self.files.usercsv.file)}, 'Continue')
        ])
    ])
}

m.mount(document.getElementById('contents'), ACView)
setLoading(false)
