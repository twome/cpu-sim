module.exports = {
    extends: "eslint:recommended",
    env: {
    	es6: true,
    	node: true
    },
    parserOptions: {
    	ecmaVersion: 2019,
    	sourceType: 'module'
    },
    rules: {
    	// 'no-unused-vars': 0
    	'no-console': 0,
    	'no-mixed-spaces-and-tabs': 0
    }

}