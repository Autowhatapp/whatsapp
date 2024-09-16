import { Router, Request, Response } from 'express';
import { axiosInstance } from '../config/axios';
import { errorHandler } from '../middleware/errorHandler';

const router = Router();

const BUSINESS_PHONE_NUMBER_ID = process.env.BUSINESS_PHONE_NUMBER_ID!;
const WABA_ID = process.env.WABA_ID!;

interface SendMessageRequest extends Request {
  body: {
    flowId: string;
    sendToNumber: string;
    flowToken: string;
    customKey?: string;
    customValue?: string;
  };
}

interface SendPublishedFlowRequest extends Request {
  body: {
    customerPhoneNumber: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    screenId: string;
    customData: Record<string, unknown>;
  };
}

interface CreateMarketingFlowRequest extends Request {
  body: {
    templateName: string;
    messageBody: string;
    flowId: string;
    screenId: string;
  };
}

router.post('/send-message', async (req: SendMessageRequest, res: Response) => {
  const { flowId, sendToNumber, flowToken, customKey, customValue } = req.body;

  if (!flowId || !sendToNumber || !flowToken) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const data = {
    messaging_product: "whatsapp",
    to: sendToNumber,
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: "flow",
      header: {
        type: "text",
        text: "Not shown in draft mode"
      },
      body: {
        text: "Not shown in draft mode"
      },
      footer: {
        text: "Not shown in draft mode"
      },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_action: "navigate",
          flow_token: flowToken,
          flow_id: flowId,
          flow_cta: "Not shown in draft mode",
          mode: "draft",
          flow_action_payload: {
            screen: "RECOMMEND",
            data: {
              [customKey || "<CUSTOM_KEY>"]: customValue || "<CUSTOM_VALUE>"
            }
          }
        }
      }
    }
  };

  try {
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/send', async (req: SendPublishedFlowRequest, res: Response) => {
  const { flowId } = req.params;
  const { customerPhoneNumber, headerText, bodyText, footerText, screenId, customData } = req.body;

  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const data = {
    messaging_product: "whatsapp",
    to: customerPhoneNumber,
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: "flow",
      header: {
        type: "text",
        text: headerText
      },
      body: {
        text: bodyText
      },
      footer: {
        text: footerText
      },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_action: "navigate",
          flow_token: "<FLOW_TOKEN>", // Update if required
          flow_id: flowId,
          flow_cta: "Open Flow!",
          flow_action_payload: {
            screen: screenId,
            data: customData
          }
        }
      }
    }
  };

  try {
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/marketing-flow', async (req: CreateMarketingFlowRequest, res: Response) => {
  const { templateName, messageBody, flowId, screenId } = req.body;

  if (!templateName || !messageBody || !flowId || !screenId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const data = {
    name: templateName,
    language: "en_US",
    category: "MARKETING",
    components: [
      {
        type: "body",
        text: messageBody
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "FLOW",
            text: "Open flow!",
            flow_id: flowId,
            navigate_screen: screenId,
            flow_action: "navigate"
          }
        ]
      }
    ]
  };

  try {
    const response = await axiosInstance.post(`${WABA_ID}/message_templates`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

export default router;