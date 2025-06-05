import { EMAIL_CONSTANTS } from '../constants/email.js';

export const generateEmailTemplate = ({
  title,
  message,
  actionUrl,
  actionText,
  footer,
}) => {
  return `
    <div style="font-family: ${EMAIL_CONSTANTS.STYLES.FONT}; line-height: 1.6; color: ${EMAIL_CONSTANTS.STYLES.TEXT_COLOR}; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${EMAIL_CONSTANTS.STYLES.BG_COLOR}; padding: 20px; border-radius: 8px;">
        <h2 style="color: ${EMAIL_CONSTANTS.STYLES.ACCENT_COLOR};">${title}</h2>
        <p>${message}</p>
        <div style="margin: 20px 0;">
        <p>${actionUrl} </p>
          <a href="${actionUrl}" style="background-color: ${EMAIL_CONSTANTS.STYLES.ACCENT_COLOR}; color: ${EMAIL_CONSTANTS.STYLES.BUTTON_TEXT_COLOR}; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
            ${actionText}
          </a>
        </div>
        <p style="font-size: 12px; color: ${EMAIL_CONSTANTS.STYLES.FOOTER_COLOR};">${footer}</p>
      </div>
    </div>
  `;
};
