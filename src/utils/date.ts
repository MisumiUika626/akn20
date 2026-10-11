import { defaultLocale, type Locale } from "@/i18n/config";
import { formatReadingTime } from "@/i18n/format";
import { siteConfig } from "@/site-config";

const numericDateFormat = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "numeric",
	timeZone: "Asia/Shanghai",
	year: "numeric",
});

export function getFormattedDate(
	date: string | number | Date,
	options?: Intl.DateTimeFormatOptions,
): string {
	if (typeof options !== "undefined") {
		return new Date(date).toLocaleDateString(siteConfig.date.locale, {
			...(siteConfig.date.options as Intl.DateTimeFormatOptions),
			...options,
		});
	}

	return numericDateFormat.format(new Date(date));
}

/** Site-wide numeric date: `3/5/2026`. */
function formatNumericDate(date: Date): string {
	return numericDateFormat.format(date);
}

export function formatRailDate(date: Date, _locale: Locale = defaultLocale): string {
	return formatNumericDate(date);
}

export function formatStampDate(date: Date, _locale: Locale = defaultLocale): string {
	return formatNumericDate(date);
}

export function formatBylineDate(date: Date, _locale: Locale = defaultLocale): string {
	return formatNumericDate(date);
}

export function formatEyebrowDate(date: Date, _locale: Locale = defaultLocale): string {
	return formatNumericDate(date);
}

export { formatReadingTime };
