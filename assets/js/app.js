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

const PERMISSIONS_LOOKUP = {
    extended: {
        WriteData: 'Wd',
        CreateFiles: 'Cf',
        CreateDirectories: 'Cd',
        AppendData: 'Ad',
        WriteExtendedAttributes: 'We',
        WriteAttributes: 'Wa',
        ReadData: 'Rd',
        ListDirectory: 'Ld',
        ReadExtendedAttributes: 'Re',
        ReadAttributes: 'Ra',
        ReadPermissions: 'Rp',
        ExecuteFile: 'Xe',
        Traverse: 'Tr',
        Delete: 'De',
        DeleteSubdirectoriesAndFiles: 'Dr',
        ChangePermissions: 'Cp',
        TakeOwnership: 'To'
    },
    main: {
        Write: 'W',
        Read: 'R',
        ReadAndExecute: 'RX',
        Modify: 'M',
        FullControl: 'Full'
    }
}

function convertPermissions (permStr) {
    let perm = {main: '', ext: ''}
    permStr = permStr.split(', ')
    for (let i = 0; i < permStr.length; i++) {
        if (permStr[i] in PERMISSIONS_LOOKUP.main) {
            perm.main += PERMISSIONS_LOOKUP.main[permStr[i]]
        } else if (permStr[i] in PERMISSIONS_LOOKUP.extended) {
            perm.ext += PERMISSIONS_LOOKUP.extended[permStr[i]]
        }
    }
    return perm
}

const PERMISSIONS = {
    Wd: {name: 'WriteData', desc: ''},
    Cf: {name: 'CreateFiles', desc: ''},
    Cd: {name: 'CreateDirectories', desc: ''},
    Ad: {name: 'AppendData', desc: ''},
    We: {name: 'WriteExtendedAttributes', desc: ''},
    Wa: {name: 'WriteAttributes', desc: ''},
    Rd: {name: 'ReadData', desc: ''},
    Ld: {name: 'ListDirectory', desc: ''},
    Re: {name: 'ReadExtendedAttributes', desc: ''},
    Ra: {name: 'ReadAttributes', desc: ''},
    Rp: {name: 'ReadPermissions', desc: ''},
    Xe: {name: 'ExecuteFile', desc: ''},
    Tr: {name: 'Traverse', desc: ''},
    De: {name: 'Delete', desc: ''},
    Dr: {name: 'DeleteSubdirectoriesAndFiles', desc: ''},
    Cp: {name: 'ChangePermissions', desc: ''},
    To: {name: 'TakeOwnership', desc: ''},
    W: {name: 'Write', desc: ''},
    R: {name: 'Read', desc: ''},
    RX: {name: 'ReadAndExecute', desc: ''},
    M: {name: 'Modify', desc: ''},
    Full: {name: 'FullControl', desc: ''}
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
    self.dataloaded = false
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
        self.dataloaded = false
        requestAnimationFrame(function () {
            Papa.parse(self.files.permcsv.file, {
                header: true,
                encoding: 'ISO-8859-2',
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
                        const perm = convertPermissions(line['FileSystemRights'])
                        if (group in self.data.groups) {
                            self.data.groups[group].push({share: share, perm: perm})
                        } else {
                            self.data.groups[group] = [{share: share, perm: perm}]
                        }
                        if (share in self.data.shares) {
                            self.data.shares[share].push({group: group, perm: perm})
                        } else {
                            self.data.shares[share] = [{group: group, perm: perm}]
                        }
                    } catch (err) {
                        self.error = "Could not load the specified files. Please check that you have selected the correct ones and try again."
                        console.error(err)
                        parser.abort()
                    }
                },
                complete: function () {
                    if (halfdone) {
                        setLoading(false)
                        self.dataloaded = true
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
                encoding: 'ISO-8859-2',
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
                    if (halfdone) {
                        setLoading(false)
                        self.dataloaded = true
                        m.redraw()
                    } else {
                        halfdone = true
                    }
                    console.log('Users parsing complete.')
                }
            })
        })
    }

    self.sresults = []
    self.scache = []
    self.smode = 'users'
    self.modeChange = function (newmode) {
        return function () {
            self.smode = newmode
            self.scache = []
            self.sresults = []
            self.openitem = ''
            self.opendata = {}
            self.pnlsize = ''
        }
    }
    self.goSearch = function (e) {
        let s = e.target.value.toLowerCase()
        if (self.scache.length === 0) {
            self.scache = Object.keys(self.data[self.smode])
        }
        self.sresults = []
        self.openitem = ''
        self.opendata = {}
        self.pnlsize = ''
        if (s.length >= 2) {
            for (let i = 0; i < self.scache.length; i++) {
                if (self.smode === 'users') {
                    if (self.scache[i].toLowerCase().indexOf(s) > -1 || self.data.users[self.scache[i]]['fullname'].toLowerCase().indexOf(s) > -1) {
                        let o = Object.assign({}, self.data.users[self.scache[i]])
                        o['username'] = self.scache[i]
                        self.sresults.push(o)
                    }
                } else if (self.smode === 'groups') {
                    if (self.scache[i].toLowerCase().indexOf(s) > -1) {
                        let o = Object.assign({}, self.data.groups[self.scache[i]])
                        o['groupname'] = self.scache[i]
                        self.sresults.push(o)
                    }
                } else if (self.smode === 'shares') {
                    if (self.scache[i].toLowerCase().indexOf(s) > -1) {
                        let o = Object.assign({}, self.data.shares[self.scache[i]])
                        o['sharename'] = self.scache[i]
                        self.sresults.push(o)
                    }
                }
            }
        }
    }

    self.openitem = ''
    self.opendata = {}
    self.open = function(item) {
        return function (e) {
            self.openitem = item
            if (self.smode === 'users') {
                self.opendata.heading = `${self.data.users[self.openitem].fullname} [${self.openitem}]`
                self.opendata.datapoint1 = {title: 'Member Of', heading: ['Group Name'], data: []}
                self.opendata.datapoint2 = {title: 'Has Access To', heading: ['Share Name', 'Permissions'], data: []}
                if (self.openitem in self.data.groups) {
                    for (let i = 0; i < self.data.groups[self.openitem].length; i++) {
                        self.opendata.datapoint2.data.push([self.data.groups[self.openitem][i].share, self.data.groups[self.openitem][i].perm.main || self.data.groups[self.openitem][i].perm.ext])
                    }
                }
                for (let i = 0; i < self.data.users[self.openitem].groups.length; i++) {
                    let curgrp = self.data.users[self.openitem].groups[i]
                    if (curgrp in self.data.groups) {
                        for (let j = 0; j < self.data.groups[curgrp].length; j++) {
                            self.opendata.datapoint2.data.push([self.data.groups[curgrp][j].share, self.data.groups[curgrp][j].perm.main || self.data.groups[curgrp][j].perm.ext])
                        }
                    }
                    self.opendata.datapoint1.data.push([curgrp])
                }
            } else if (self.smode === 'groups') {
                self.opendata.heading = self.openitem
                self.opendata.datapoint1 = {title: 'Members', heading: ['User Name'], data: []}
                self.opendata.datapoint2 = {title: 'Has Access To', heading: ['Share Name', 'Permissions'], data: []}
                if (self.openitem in self.data.groups) {
                    for (let i = 0; i < self.data.groups[self.openitem].length; i++) {
                        self.opendata.datapoint2.data.push([self.data.groups[self.openitem][i].share, self.data.groups[self.openitem][i].perm.main || self.data.groups[self.openitem][i].perm.ext])
                    }
                }
                for (let user in self.data.users) {
                    if (self.data.users[user].groups.indexOf(self.openitem) > -1) {
                        self.opendata.datapoint1.data.push([`${self.data.users[user].fullname} [${user}]`])
                    }
                }
            } else if (self.smode === 'shares') {
                self.opendata.heading = self.openitem
                self.opendata.datapoint1 = {title: 'Users Who Can Access', heading: ['User Name', 'From Group', 'Permissions'], data: []}
                self.opendata.datapoint2 = {title: 'Groups Who Can Access', heading: ['Group Name', 'Permissions'], data: []}
                if (self.openitem in self.data.shares) {
                    for (let i = 0; i < self.data.shares[self.openitem].length; i++) {
                        self.opendata.datapoint2.data.push([self.data.shares[self.openitem][i].group, self.data.shares[self.openitem][i].perm.main || self.data.shares[self.openitem][i].perm.ext])
                    }
                }
                for (let i = 0; i < self.opendata.datapoint2.data.length; i++) {
                    for (let user in self.data.users) {
                        if (self.data.users[user].groups.indexOf(self.opendata.datapoint2.data[i][0]) > -1) {
                            self.opendata.datapoint1.data.push([`${self.data.users[user].fullname} [${user}]`, self.opendata.datapoint2.data[i][0], self.opendata.datapoint2.data[i][1]])
                        }
                        if (self.opendata.datapoint2.data[i][0] === user) {
                            self.opendata.datapoint1.data.push([`${self.data.users[user].fullname} [${user}]`, '(directly applied)', self.opendata.datapoint2.data[i][1]])
                        }
                    }
                }
            }
            //self.opendata.datapoint1.data.sort()
            //self.opendata.datapoint2.data.sort()
        }
    }
    self.close = function () {
        self.openitem = ''
        self.opendata = {}
        self.pnlsize = ''
    }
    self.pnlsize = ''
    self.expandreduce = function (which) {
        return function () {
            if (self.pnlsize === which) {
                self.pnlsize = ''
            } else {
                self.pnlsize = which
            }
        }
    }
}

ACView.view = function () {
    const self = this
    const maxicon = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath d='M0 0v4l1.5-1.5 1.5 1.5 1-1-1.5-1.5 1.5-1.5h-4zm5 4l-1 1 1.5 1.5-1.5 1.5h4v-4l-1.5 1.5-1.5-1.5z' id='fullscreen-enter'%3e%3c/path%3e%3c/svg%3e"
    const minicon = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3e%3cpath d='M1 0l-1 1 1.5 1.5-1.5 1.5h4v-4l-1.5 1.5-1.5-1.5zm3 4v4l1.5-1.5 1.5 1.5 1-1-1.5-1.5 1.5-1.5h-4z' id='fullscreen-exit'%3e%3c/path%3e%3c/svg%3e"
    return self.dataloaded ? m('.jumbotron.appwindow.maximized.d-flex.flex-column', [
        m('.row.flex-shrink-0', [
            m('.col-auto', [
                m('h1.apptitle', 'ACView'),
                m('h4.appsubtitle', 'by Jean-François Desrochers')
            ]),
            m('.col', [
                m('.form-group.mb-1.mt-2', [
                    m('strong.ml-1.mr-2', 'Search for :'),
                    m('.custom-control.custom-radio.custom-control-inline', [
                        m('input.custom-control-input#rduser', {type: 'radio', name: 'searchfor', onchange: self.modeChange('users'), checked: (self.smode === 'users')}),
                        m('label.custom-control-label', {for: 'rduser'}, 'User')
                    ]),
                    m('.custom-control.custom-radio.custom-control-inline', [
                        m('input.custom-control-input#rdgroup', {type: 'radio', name: 'searchfor', onchange: self.modeChange('groups'), checked: (self.smode === 'groups')}),
                        m('label.custom-control-label', {for: 'rdgroup'}, 'Group')
                    ]),
                    m('.custom-control.custom-radio.custom-control-inline', [
                        m('input.custom-control-input#rdshare', {type: 'radio', name: 'searchfor', onchange: self.modeChange('shares'), checked: (self.smode === 'shares')}),
                        m('label.custom-control-label', {for: 'rdshare'}, 'Share')
                    ])
                ]),
                m('.form-group', [
                    m('input.form-control#search', {
                        placeholder: 'Enter your search here...',
                        oninput: self.goSearch,
                        oncreate: (vnode) => {
                            vnode.dom.focus()
                        }
                    })
                ])
            ])
        ]),
        m('.row.flex-grow-1', [
            m((self.openitem ? '.col-3.d-flex.pr-0' : '.col.d-flex'), [
                m('.card.flex-grow-1', [
                    m('.card-header', 'Search results'),
                    self.sresults.length > 0 ? m('.card-body.d-flex', [
                        m('.flex-grow-1.overflow-auto', m('table.table.table-sm', [
                            m('thead', (self.smode === 'users') ? m('tr', [
                                m('th', 'User Name'),
                                m('th', 'Full Name'),
                                m('th', 'Active')
                            ]) : (self.smode === 'groups') ? m('tr', [
                                m('th', 'Group Name')
                            ]) : m('tr', [
                                m('th', 'Share Name')
                            ])),
                            m('tbody', self.sresults.map((o) => {
                                if (self.smode === 'users') {
                                    return m('tr' + (self.openitem === o.username ? '.bg-primary.text-white' : ''), {key: o.username, onclick: self.open(o.username)}, [m('td', o.username), m('td', o.fullname), m('td', o.active)])
                                } else if (self.smode === 'groups') {
                                    return m('tr' + (self.openitem === o.groupname ? '.bg-primary.text-white' : ''), {key: o.groupname, onclick: self.open(o.groupname)}, m('td', o.groupname))
                                } else if (self.smode === 'shares') {
                                    return m('tr' + (self.openitem === o.sharename ? '.bg-primary.text-white' : ''), {key: o.sharename, onclick: self.open(o.sharename)}, m('td', o.sharename))
                                }
                            }))
                        ]))
                    ]) : m('.card-body.d-flex.justify-content-center.align-items-center.flex-column', [
                        m('h3', 'Search results will appear here.'),
                        m('p', 'Use the search bar above to input your search and results will automatically appear in this window. Click on a result to view it.')
                    ])
                ])
            ]), self.openitem ? m('.col.d-flex.flex-column', [
                m('.lead.mb-1', [
                    self.opendata.heading,
                    m('button.close', {onclick: self.close}, m('span', m.trust('&times;')))
                ]),
                m(`.card.flex-split${self.pnlsize === 'dp1' ? '' : '.mb-2'}`, {style: self.pnlsize === 'dp2' ? 'display: none;' : ''}, [
                    m('.card-header', [
                        self.opendata.datapoint1.title,
                        m('button.close', {onclick: self.expandreduce('dp1')}, m('img', {src: self.pnlsize === 'dp1' ? minicon : maxicon}))
                    ]),
                    m('.card-body.d-flex', [
                        m('.flex-grow-1.overflow-auto', m('table.table.table-sm', [
                            m('thead', m('tr', self.opendata.datapoint1.heading.map((h) => {
                                return m('th', h)
                            }))),
                            m('tbody', self.opendata.datapoint1.data.map((o) => {
                                return m('tr', o.map((i) => {
                                    return m('td', i)
                                }))
                            }))
                        ]))
                    ])
                ]),
                m(`.card.flex-split${self.pnlsize === 'dp2' ? '' : '.mt-2'}`, {style: self.pnlsize === 'dp1' ? 'display: none;' : ''}, [
                    m('.card-header', [
                        self.opendata.datapoint2.title,
                        m('button.close', {onclick: self.expandreduce('dp2')}, m('img', {src: self.pnlsize === 'dp2' ? minicon : maxicon}))
                    ]),
                    m('.card-body.d-flex', [
                        m('.flex-grow-1.overflow-auto', m('table.table.table-sm', [
                            m('thead', m('tr', self.opendata.datapoint2.heading.map((h) => {
                                return m('th', h)
                            }))),
                            m('tbody', self.opendata.datapoint2.data.map((o) => {
                                return m('tr', o.map((i) => {
                                    return m('td', i)
                                }))
                            }))
                        ]))
                    ])
                ])
            ]) : ''
        ])
    ]) : m('.jumbotron.appwindow', [
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
