const { withAndroidStyles, withMainActivity, AndroidConfig } = require('@expo/config-plugins');

/**
 * Text clipped by a hidden second line on Android ("Today" → "Toda",
 * "Routine" → "Routin", "8 AM" → "8"). React Native measures a label's width
 * itself, then a TextView draws it; if the TextView draws wider than measured,
 * the last letter or word wraps onto a line the box has no room for.
 *
 * Two platform behaviours make it draw wider:
 *
 * 1. Android 15 (targetSdk 35+) defaults `android:useBoundsForWidth` to true,
 *    sizing by glyph ink bounds instead of advance widths. Turned off in the theme.
 *
 * 2. The system "Bold text" / font-weight setting (Android 12+, and OEM text
 *    weight sliders) sets `Configuration.fontWeightAdjustment`. TextView applies
 *    it and fake-bolds every font, but React Native's measurement does not, so
 *    every single-line label overflows. The activity resets the adjustment to 0
 *    so drawing matches measurement.
 */
const MARKER = '// lokkhyo-text-fix: fontWeightAdjustment';

const ATTACH_BASE_CONTEXT = `
  ${MARKER}
  override fun attachBaseContext(newBase: android.content.Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val config = android.content.res.Configuration(newBase.resources.configuration)
      if (config.fontWeightAdjustment != 0) {
        config.fontWeightAdjustment = 0
        super.attachBaseContext(newBase.createConfigurationContext(config))
        return
      }
    }
    super.attachBaseContext(newBase)
  }
`;

function withUseBoundsForWidthOff(config) {
  return withAndroidStyles(config, (modConfig) => {
    modConfig.modResults = AndroidConfig.Styles.setStylesItem({
      xml: modConfig.modResults,
      parent: { name: 'AppTheme' },
      item: {
        $: { name: 'android:useBoundsForWidth' },
        _: 'false',
      },
    });
    return modConfig;
  });
}

function withFontWeightAdjustmentReset(config) {
  return withMainActivity(config, (modConfig) => {
    const activity = modConfig.modResults;
    if (activity.language !== 'kt') {
      throw new Error('withAndroidTextFix: expected a Kotlin MainActivity');
    }
    if (activity.contents.includes(MARKER)) return modConfig;

    let contents = activity.contents;
    if (!contents.includes('import android.os.Build')) {
      contents = contents.replace(/^(package .+)$/m, '$1\n\nimport android.os.Build');
    }
    const anchor = /class MainActivity : ReactActivity\(\) \{\n/;
    if (!anchor.test(contents)) {
      throw new Error('withAndroidTextFix: could not find the MainActivity class body');
    }
    activity.contents = contents.replace(anchor, (match) => match + ATTACH_BASE_CONTEXT);
    return modConfig;
  });
}

function withAndroidTextFix(config) {
  return withFontWeightAdjustmentReset(withUseBoundsForWidthOff(config));
}

module.exports = withAndroidTextFix;
