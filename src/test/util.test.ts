import * as assert from 'assert';
import * as util from '../util';

test('util.normalizePath', () => {
    assert.strictEqual(util.normalizePath('/c:/folder/file.test'), 'c:/folder/file.test');
    assert.strictEqual(util.normalizePath('/a:/folder/file.test'), 'a:/folder/file.test');
    assert.strictEqual(util.normalizePath('C:\\folder\\file.test'), 'c:/folder/file.test');
    assert.strictEqual(util.normalizePath('a:\\folder\\file.test'), 'a:/folder/file.test');

    assert.strictEqual(util.normalizePath('c:/folder/file.test'), 'c:/folder/file.test');
    assert.strictEqual(util.normalizePath('//c:/folder/file.test'), '//c:/folder/file.test');
    assert.strictEqual(util.normalizePath('/folder/file.test'), '/folder/file.test');
    assert.strictEqual(util.normalizePath('./folder/file.test'), './folder/file.test');
});