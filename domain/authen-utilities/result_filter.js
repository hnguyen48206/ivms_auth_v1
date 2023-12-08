function checkInclude(tempOperator) {
    if (tempOperator.includes('includes'))
        return ')'
    else
        return ''
}

function getResult(valueArray, filterStatement) {
    console.log(filterStatement)
    return valueArray.filter(function (currentElement) {
        if(eval(filterStatement))
        return currentElement;
    });
}

function createFilterStatement(filterArray) {
    let filterStatement = ''
    for (let i = 0; i < filterArray.length; ++i) {

        let tempOperator = filterArray[i].operator
        if (filterArray[i].operator == `=`)
            tempOperator = `==`
        else if (filterArray[i].operator == `contain`)
            tempOperator = `.includes(`

        let tempFieldName = `currentElement.${filterArray[i].filedName}`

        let tempValue = filterArray[i].value
        if (filterArray[i].type == 'string')
            tempValue = `'${tempValue}'`

        if (filterStatement.endsWith(`||`)) {
            if (filterArray[i].linking == 'and') {
                filterStatement = filterStatement + `(${tempFieldName}${tempOperator}${tempValue}${checkInclude(tempOperator)}))` + `&&`
            }
            else if (filterArray[i].linking == 'or' && i!=(filterArray.length-1)) {
                filterStatement = filterStatement + `(${tempFieldName}${tempOperator}${tempValue}${checkInclude(tempOperator)})` + `||`
            }
            else
            filterStatement = filterStatement + `(${tempFieldName}${tempOperator}${tempValue}${checkInclude(tempOperator)}))` + `&&`
        }
        else {
            if (filterArray[i].linking == 'and') {
                filterStatement = filterStatement + `(${tempFieldName}${tempOperator}${tempValue}${checkInclude(tempOperator)})` + `&&`
            }
            else if (filterArray[i].linking == 'or' && i!=(filterArray.length-1)) {
                filterStatement = filterStatement + `((${tempFieldName}${tempOperator}${tempValue}${checkInclude(tempOperator)})` + `||`
            }
            else
            filterStatement = filterStatement + `(${tempFieldName}${tempOperator}${tempValue}${checkInclude(tempOperator)})` + `&&`
        }
    }
    return filterStatement.slice(0, -2);
}

module.exports = {
   filterArray(valueArray, filterArray)
   {
     return getResult(valueArray, createFilterStatement(filterArray))
   }
}