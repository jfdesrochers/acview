const m = require('mithril')
const Papa = require('papaparse')

function setLoading (isLoading, ldMessage) {
    const contents = document.getElementById('contents')
    const ldblock = document.getElementById('loading')
    const ldtext = document.getElementById('loadingtext')
    if (isLoading) {
        if (ldMessage) {
            ldtext.textContent = ldMessage
        }
        ldblock.classList.add('visible')
        contents.classList.remove('visible')
    } else {
        ldblock.classList.remove('visible')
        contents.classList.add('visible')
    }
}

const ACView = {}

ACView.oninit = function () {
    const self = this
    self.error = ''
    self.files = {
        permcsv: {default: 'Click to browse for Permissions CSV...', file: undefined},
        usercsv: {default: 'Click to browse for Users CSV...', file: undefined}
    }
    self.data = {
        users: {},
        groups: {},
        shares: {}
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
    self.goparse = function (e) {
        e.preventDefault()
        self.error = ''
        console.log('Permissions parsing started...')
        setLoading(true, 'Loading permissions and users...')
        self.data.groups = {}
        self.data.shares = {}
        let halfdone = false
        requestAnimationFrame(function () {
            Papa.parse(self.files.permcsv.file, {
                header: true,
                step: function (results, parser) {
                    try {
                        if (!results.meta.fields || results.meta.fields[0] !== 'Folder Path') {
                            self.error = 'You have loaded a wrong permissions file! Please open the correct one and try again!'
                            parser.abort()
                        }
                        const line = results.data[0]
                        if (!line['IdentityReference'] || line['IdentityReference'].indexOf('BUILTIN') > -1 || line['IdentityReference'].indexOf('\\') === -1) return
                        const group = line['IdentityReference'].split('\\')[1]
                        const share = line['Folder Path']
                        if (group in self.data.groups) {
                            self.data.groups[group].push(share)
                        } else {
                            self.data.groups[group] = [share]
                        }
                        if (share in self.data.shares) {
                            self.data.shares[share].push(group)
                        } else {
                            self.data.shares[share] = [group]
                        }
                    } catch (err) {
                        self.error = "Could not load the specified files. Please check that you have selected the correct ones and try again."
                        console.error(err)
                        parser.abort()
                    }
                },
                complete: function () {
                    console.log(self.data.groups)
                    console.log(self.data.shares)
                    if (halfdone) {
                        setLoading(false)
                        m.redraw()
                    } else {
                        halfdone = true
                    }
                    console.log('Permissions parsing complete.')
                }
            })
            console.log('Users parsing started...')
            self.data.users = {}
            Papa.parse(self.files.usercsv.file, {
                header: true,
                step: function (results, parser) {
                    try {
                        if (!results.meta.fields || results.meta.fields[0] !== 'UserName') {
                            self.error = 'You have loaded a wrong users file! Please open the correct one and try again!'
                            parser.abort()
                        }
                        const line = results.data[0]
                        if (!line['UserName']) return
                        const user = line['UserName']
                        if (user in self.data.users) {
                            self.data.users[user].groups.push(line['GroupName'])
                        } else {
                            self.data.users[user] = {fullname: line['FullName'], active: line['AccountActive'], groups: [line['GroupName']]}
                        }
                    } catch (err) {
                        self.error = "Could not load the specified files. Please check that you have selected the correct ones and try again."
                        console.error(err)
                        parser.abort()
                    }
                },
                complete: function () {
                    console.log(self.data.users)
                    if (halfdone) {
                        setLoading(false)
                        m.redraw()
                    } else {
                        halfdone = true
                    }
                    console.log('Users parsing complete.')
                }
            })
        })
    }
}

ACView.view = function () {
    const self = this
    return m('.jumbotron.appwindow', [
        m('.text-center', [
            m('h1.apptitle', 'ACView'),
            m('h4.appsubtitle', 'by Jean-François Desrochers'),
            m('h3.titletext.mb-2', 'Access Control Viewer'),
            m('p.mb-2', m.trust('ACView allows you to quickly view all the shares a specific Active Directory user has access to. You will need to run the following two scripts on your server: <a target="_blank" href="https://github.com/jfdesrochers/acview/blob/master/CheckPermissions.ps1">CheckPermissions.ps1</a> and <a target="_blank" href="https://github.com/jfdesrochers/acview/blob/master/CheckUsers.ps1">CheckUsers.ps1</a>. Then, use the forms below to load the results from those scripts.'))
        ]),
        self.error !== '' ? m('.alert.alert-danger', [
            m('h4.alert-heading', 'Error'),
            m('p', self.error),
        ]) : '',
        m('.custom-file.csvbrowser.mb-2', [
            m('input.custom-file-input#permcsv', {type: 'file', onchange: self.onfilechange}),
            m('label.custom-file-label', {for: 'permcsv'}, self.files.permcsv.file ? self.files.permcsv.file.name : self.files.permcsv.default)
        ]),
        m('.custom-file.csvbrowser.mb-3', [
            m('input.custom-file-input#usercsv', {type: 'file', onchange: self.onfilechange}),
            m('label.custom-file-label', {for: 'usercsv'}, self.files.usercsv.file ? self.files.usercsv.file.name : self.files.usercsv.default)
        ]),
        m('.text-center', [
            m('button.btn.btn-primary', {disabled: !(self.files.permcsv.file && self.files.usercsv.file), onclick: self.goparse}, 'Continue')
        ])
    ])
}

m.mount(document.getElementById('contents'), ACView)
setLoading(false)
