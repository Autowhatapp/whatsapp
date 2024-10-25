import { Router, Request, Response } from "express";
import axios from "axios";
import generateFlowJSON from "./generateFlowjson"; // Assume this function is exported from where it's defined

import { axiosInstance } from "../config/axios";
const router = Router();
import { errorHandler } from "../middleware/errorHandler";
const BUSINESS_PHONE_NUMBER_ID = process.env.BUSINESS_PHONE_NUMBER_ID!;
const WABA_ID = process.env.WABA_ID!;

interface OrchestrationRequest extends Request {
  body: {
    schema: any;
    flowName: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    customerPhoneNumber: string;
  };
}

router.post(
  "/orchestrate-flow",
  async (req: OrchestrationRequest, res: Response) => {
    const {
      schema,
      flowName,
      headerText,
      bodyText,
      footerText,
      customerPhoneNumber,
    } = req.body;
    try {
      // Step 1: Create Flow
      const createFlowResponse = await axios.post(
        "http://localhost:8500/api/flows/createflow",
        {
          name: flowName,
          categories: ["OTHER"],
        }
      );

      const flowId = createFlowResponse.data.id;

      // Step 2: Generate JSON
      const flowJSON = generateFlowJSON(schema);

      // Step 3: Update Flow
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([JSON.stringify(flowJSON)], { type: "application/json" }),
        "flow.json"
      );
      await axios.post(
        `${process.env.CURRENT_SERVER}/api/flows/updateflow/${flowId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      // Step 4: Send Published Flow

      const sendToNumber = customerPhoneNumber;
      const flowToken = "asdsd";
      const customKey = "<CUSTOM_KEY>";
      const screenId = schema.screens[0].id;

      const customValue = "<CUSTOM_VALUE>";

      if (!flowId || !sendToNumber || !flowToken) {
        return res.status(400).json({ error: "Missing required parameters" });
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
            text: "Not shown in draft mode",
          },
          body: {
            text: "Not shown in draft mode",
          },
          footer: {
            text: "Not shown in draft mode",
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
                screen: screenId,
                data: {
                  [customKey || "<CUSTOM_KEY>"]:
                    customValue || "<CUSTOM_VALUE>",
                },
              },
            },
          },
        },
      };

      try {
        const response = await axiosInstance.post(
          `${BUSINESS_PHONE_NUMBER_ID}/messages`,
          data
        );
        res.json(response.data);
      } catch (error) {
        errorHandler(error, res);
      }
    } catch (error) {
      console.error("Error in flow orchestration:", error);
      res
        .status(500)
        .json({ error: "An error occurred during flow orchestration" });
    }
  }
);

export default router;
