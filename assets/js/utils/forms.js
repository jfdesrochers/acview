const m = require('mithril')

module.exports.serializeFieldSet = function(fieldSet) {
    let res = {};
    Object.keys(fieldSet).forEach(function (o) {
        res[o] = fieldSet[o].value;
    });
    return res;
}

module.exports.deserializeFieldSet = function(data, fieldSet) {
    Object.keys(data).forEach(function (o) {
        if (fieldSet[o]) {
            fieldSet[o].value = data[o];
            fieldSet[o].valid = null;
        }
    });
}

module.exports.resetValidation = function(fieldSet) {
    Object.keys(fieldSet).forEach(function (o) {
        fieldSet[o].valid = null;
    });
}

module.exports.validateFieldSet = function (fieldSet) {
    return Object.keys(fieldSet).every(function (k) {
        return fieldSet[k].validate();
    })
}

module.exports.InputField = {
    oninit: function (vnode) {
        let params = vnode.attrs;
        let self = this;
        self.validated = false;
        self.validate = function () {
            if (self.validated) return;
            let isValid = params.regEx.test(params.fieldSet[params.name].value);
            if (isValid) {
                if (typeof params.filter === 'function') {
                    let filtered = params.filter(params.fieldSet[params.name].value, params.regEx);
                    if (filtered === false) {
                        isValid = false;
                    } else {
                        params.fieldSet[params.name].value = filtered;
                    }
                } else if (typeof params.filter === 'string') {
                    params.fieldSet[params.name].value = params.fieldSet[params.name].value.replace(params.regEx, params.filter);
                };
            };
            params.fieldSet[params.name].valid = isValid;
            return isValid;
        }
        self.onChange = function (e) {
            params.fieldSet[params.name].value = e.target.value;
            self.validate();
            self.validated = true;
            if (typeof params.onChange === 'function') {
                params.onChange(e, params.fieldSet[params.name]);
            };
        }
        self.onExit = function () {
            self.validate();
            self.validated = false;
        }
        if (!params.fieldSet[params.name]) {
            params.fieldSet[params.name] = {
                value: params.defaultValue,
                valid: null,
                validate: self.validate
            }
        }
    },
    view: function (vnode) {
        let params = vnode.attrs;
        let self = this;

        let isValid = params.fieldSet[params.name].valid

        return m('.form-group', [
            m('label', {'for': params.name}, params.label),
            m('input.form-control'  + (params.small ? '-sm' : '') + (isValid === true ? '.is-valid' : isValid === false ? '.is-invalid' : ''), {
                oncreate: function (vdom) {
                    if (params.autofocus) {
                        vdom.dom.focus();
                    }
                },
                id: params.name,
                name: params.name,
                type: params.type || 'text',
                placeholder: params.label,
                value: params.fieldSet[params.name].value,
                onchange: self.onChange,
                onblur: self.onExit,
                disabled: params.disabled || false
            }),
            (isValid === true && params.successText) ? m('div.valid-feedback', params.successText) :
            (isValid === false && params.errorText) ? m('div.invalid-feedback', params.errorText) : 
            (params.helpText) ? m('small.form-text.text-muted', params.helpText) : ''
        ])
    }
}