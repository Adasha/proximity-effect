let _testObj;

class TestClass
{
    constructor(val, obj = {})
    {
        this.testVal = val;
        _testObj = obj;

        this.testProp = obj.prop || "text";

        this.init();
    }

    get testProp()
    {
        return _testObj.prop;
    }

    set testProp(val)
    {
        _testObj.prop = val;
    }

    testFunc()
    {
        this.testVal = this.testProp;
    }

    init()
    {
        this.testFunc();
        console.log(this.testVal);
        console.log(this.testProp);
    }
}
