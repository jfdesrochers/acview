const path = require('path')

module.exports = {
    entry: './assets/js/app.js',
    output: {
        path: path.resolve(__dirname, 'assets', 'js'),
        publicPath: '/assets/js/',
        filename: 'appbundle.min.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['env']
                    }
                }
            }
        ]
    },
    devServer: {
        port: 3000,
        host: '0.0.0.0'
    }
}