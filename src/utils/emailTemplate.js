// utils/emailTemplate.js

export const generateEmailTemplate = ({
  title,
  message,
  actionUrl,
  actionText,
  footer,
}) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px;">
        <h2 style="color: #4CAF50;">${title}</h2>
        <p>${message}</p>
        <div style="margin: 20px 0;">
          <a href="${actionUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
            ${actionText}
          </a>
        </div>
        <p style="font-size: 12px; color: #777;">${footer}</p>
      </div>
    </div>
  `;
};
