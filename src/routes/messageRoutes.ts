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
    body: any;
    customerPhoneNumber: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    screenId: string;
    customData: string;
    flowdata: {
      workspaces: Array<any>;
      newusers: Array<any>;
    };
  };
  params: {
    flowId: string;
  };
}
interface SendPublishedFlowRequestUser extends Request {
  body: {
    body: any;
    customerPhoneNumber: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    screenId: string;
    customData: string;
    flowdata: {
      datafilledby: string;
      databasename: string;
      botId:string
    };
  };
  params: {
    flowId: string;
  };
}
interface SendPublishedFlowRequest1 extends Request {
  body: {
    customerPhoneNumber: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    screenId: string;
    customData: string;
    flowdata: {
      workspaces: Array<any>;
      newusers: Array<any>;
    };
    botid:string;
    userId: string;
    flowIdog:string // Add this line
  };
  params: {
    flowId: string;
  };
}

// interface SendPublishedFlowRequest extends Request {
//   body: {
//     customerPhoneNumber: string;
//     headerText: string;
//     bodyText: string;
//     footerText: string;
//     screenId: string;
//     customData: Record<string, unknown>;
//     flowdata:string
//   };
// }

interface CreateMarketingFlowRequest extends Request {
  body: {
    templateName: string;
    messageBody: string;
    flowId: string;
    screenId: string;
  };
}

interface SendButtonMessageRequest extends Request {
  body: {
    to: string;
    buttonText: string;
    buttons: Array<{ id: string; title: string }>;
  };
}

interface SendListMessageRequest extends Request {
  body: {
    to: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    buttonText: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description: string }>;
    }>;
  };
}
interface SendTextMessageRequest {
  recipientPhoneNumber: string; // The recipient's phone number
  messageContent: string;        // The text message content
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

  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payload
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
          mode: "draft",
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Open Flow!",
          flow_action_payload: {
            screen: screenId,
            data: {
              workspaceid: {
                type: "string",
                __example__: "Reports & Approvals"
              },
              namelabel: {
                type: "string",
                __example__: "Full Name"
              },
              companylabel: {
                type: "string",
                __example__: "Company Name"
              },
              bufferlabel: {
                type: "string",
                __example__: "Buffer In/Out Mins"
              },
             
    workspaces: flowdata?.workspaces, // Assuming flowdata.workspaces is an array
    newusers: flowdata?.newusers // Assuming flowdata.newusers is an array
            }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/sendsignup', async (req: SendPublishedFlowRequest, res: Response) => {
  const { flowId } = req.params;

  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payloads
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
          mode: "draft",
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Open Flow!",
          flow_action_payload: {
            screen: "Sign_Up",
            data: {
              title:  "Sign Up"
              ,
              namelabel:  "Full Name"
              ,
              companylabel:  "Workspace Name"
              
            }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/sendsignupP', async (req: SendPublishedFlowRequest, res: Response) => {
  const { flowId } = req.params;

  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payloads
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
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Click to Signup",
          flow_action_payload: {
            screen: "Sign_Up",
            data: {
              title:  "Sign Up"
              ,
              namelabel:  "Full Name"
              ,
              companylabel:  "Workspace Name"
              
            }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/sendcreateworkspace', async (req: SendPublishedFlowRequest, res: Response) => {
  const { flowId } = req.params;

  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payloads
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
          mode: "draft",
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Open Flow!",
          flow_action_payload: {
            screen: "testssd",
            data: {
              title:  "Sign Up"
            
              ,
              companylabel:  "Workspace Name"
              
            }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/sendcreateworkspaceP', async (req: SendPublishedFlowRequest, res: Response) => {
  const { flowId } = req.params;

  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payloads
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
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Click to Create Workspace",
          flow_action_payload: {
            screen: "testssd",
            data: {
              title:  "Sign Up"
            
              ,
              companylabel:  "Workspace Name"
              
            }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/senddraft', async (req: SendPublishedFlowRequest, res: Response) => {
  const { flowId } = req.params;



  // Log incoming data for debugging
  console.log("sda",flowId,"sda",req.params, req.body, "asdsadsadIncoming data");



  // Prepare the data payload
  const data = {
    messaging_product: "whatsapp",
    to: req.body.body.customerPhoneNumber,
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
          flow_token: "flowToken",
          flow_id: flowId,
          flow_cta: "Not shown in draft mode",
          mode: "draft",
          flow_action_payload: {
            screen: req.body.body.screenId,
            data: {
              [ "<CUSTOM_KEY>"]:  "<CUSTOM_VALUE>"
            }
          }
        }
      }
    }
  };

  // // Log the constructed payload for debugging
  // console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    console.log(response,"ye draft post ka response")
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/senddraftuser', async (req: SendPublishedFlowRequestUser, res: Response) => {
  const { flowId } = req.params;

  const {flowdata} = req.body.body

  // console.log

  // Log incoming data for debugging
  console.log("sda",flowId,"sda",req.params, req.body,flowdata, "asdsadsadIncoming data");



  // Prepare the data payload
  const data = {
    messaging_product: "whatsapp",
    to: req.body.body.customerPhoneNumber,
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
          flow_token: "flowToken",
          flow_id: flowId,
          flow_cta: "Not shown in draft mode",
          mode: "draft",
          flow_action_payload: {
            screen: req.body.body.screenId,
            data: {
              "datafilledby" : flowdata.datafilledby,
              "databasename" : flowdata.databasename,
              "botId":flowdata.botId
            }
          }
        }
      }
    }
  };

  // // Log the constructed payload for debugging
  // console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    console.log({ data: data.interactive })
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    console.log(response,"ye draft post ka response")
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/editbot', async (req: SendPublishedFlowRequest1, res: Response) => {
  const { flowId } = req.params;
  
  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    botid,
    flowdata,
    userId,
    flowIdog
     // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payload
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
          mode: "draft",
          flow_token: "customData",
          flow_id: flowId,
          flow_cta: "Open Flow!",
          flow_action_payload: {
            screen: screenId,
            data: {
              botinfo: customData,
              botId:botid,
              userId:userId,
              flowIdog:flowIdog

            }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
   // errorHandler(error, res);
  }
});

router.post('/flows/:flowId/sendcreatbotform', async (req: SendPublishedFlowRequest1, res: Response) => {
  const { flowId } = req.params;
  
  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata,
    userId
     // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payload
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
          mode: "draft",
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Open Flow!",
          flow_action_payload: {
            screen: screenId,
            data: {
              workspaceid: customData,
              userId :userId,
              namelabel: {
                type: "string",
                __example__: "Full Name"
              },
              companylabel: {
                type: "string",
                __example__: "Company Name"
              },
              bufferlabel: {
                type: "string",
                __example__: "Buffer In/Out Mins"
              },
             
    workspaces: flowdata?.workspaces, // Assuming flowdata.workspaces is an array
    newusers: flowdata?.newusers // Assuming flowdata.newusers is an array
            }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
   // errorHandler(error, res);
  }
});

router.post('/flows/:flowId/sendcreatbotformP', async (req: SendPublishedFlowRequest1, res: Response) => {
  const { flowId } = req.params;
  
  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata,
    userId
     // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payload
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
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Click to Create Form/Bot",
          flow_action_payload: {
            screen: screenId,
            data: {
              workspaceid: customData,
              userId :userId,
              namelabel: {
                type: "string",
                __example__: "Full Name"
              },
              companylabel: {
                type: "string",
                __example__: "Company Name"
              },
              bufferlabel: {
                type: "string",
                __example__: "Buffer In/Out Mins"
              },
             
    workspaces: flowdata?.workspaces, // Assuming flowdata.workspaces is an array
    newusers: flowdata?.newusers // Assuming flowdata.newusers is an array
            }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
   // errorHandler(error, res);
  }
});

router.post('/flows/:flowId/sendhi', async (req: SendPublishedFlowRequest, res: Response) => {
  const { flowId } = req.params;
  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payload
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
          mode: "draft",
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Open Flow!",
          flow_action_payload: {
            screen: screenId,
            data: {
              workspaceid: {
                type: "string",
                __example__: "Reports & Approvals"
              },
              namelabel: {
                type: "string",
                __example__: "Full Name"
              },
              companylabel: {
                type: "string",
                __example__: "Company Name"
              },
              bufferlabel: {
                type: "string",
                __example__: "Buffer In/Out Mins"
              },
             
    workspaces : flowdata
       }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/sendhiP', async (req: SendPublishedFlowRequest, res: Response) => {
  const { flowId } = req.params;
  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payload
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
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Click to Enter your Workspace",
          flow_action_payload: {
            screen: screenId,
            data: {
              workspaceid: {
                type: "string",
                __example__: "Reports & Approvals"
              },
              namelabel: {
                type: "string",
                __example__: "Full Name"
              },
              companylabel: {
                type: "string",
                __example__: "Company Name"
              },
              bufferlabel: {
                type: "string",
                __example__: "Buffer In/Out Mins"
              },
             
    workspaces : flowdata
       }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/flows/:flowId/senduserhi', async (req: SendPublishedFlowRequest, res: Response) => {
  const { flowId } = req.params;
  const {
    customerPhoneNumber,
    headerText,
    bodyText,
    footerText,
    screenId,
    customData,
    flowdata // Assuming this is already an array of objects
  } = req.body;

  // Log incoming data for debugging
  console.log(req.params, req.body, "Incoming data");

  // Validate required fields
  if (!customerPhoneNumber || !headerText || !bodyText || !footerText || !screenId || !customData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data payload
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
          mode: "draft",
          flow_token: customData,
          flow_id: flowId,
          flow_cta: "Open Flow!",
          flow_action_payload: {
            screen: screenId,
            data: {
              workspaceid: {
                type: "string",
                __example__: "Reports & Approvals"
              },
              namelabel: {
                type: "string",
                __example__: "Full Name"
              },
              companylabel: {
                type: "string",
                __example__: "Company Name"
              },
              bufferlabel: {
                type: "string",
                __example__: "Buffer In/Out Mins"
              },
             
    workspaces : flowdata
       }
          }
        }
      }
    }
  };

  // Log the constructed payload for debugging
  console.log(data.interactive.action.parameters.flow_action_payload.data);

  try {
    // Send the request
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

router.post('/messages/send-text', async (req: Request<{}, {}, SendTextMessageRequest>, res: Response) => {
  const { recipientPhoneNumber, messageContent } = req.body;

  // Check for required fields
  if (!recipientPhoneNumber || !messageContent) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prepare the data for the API request
  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhoneNumber,
    type: "text",
    text: {
      preview_url: false,
      body: messageContent
    }
  };

  try {
    const response = await axiosInstance.post(`${BUSINESS_PHONE_NUMBER_ID}/messages`, data);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post('/send-button-message', async (req: SendButtonMessageRequest, res: Response) => {

  const { to, buttonText, buttons } = req.body;

  if (!to || !buttonText || !buttons || buttons.length === 0) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: buttonText
      },
      action: {
        buttons: buttons.map(button => ({
          type: "reply",
          reply: {
            id: button.id,
            title: button.title
          }
        }))
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

router.post('/send-list-message', async (req: SendListMessageRequest, res: Response) => {
  const { to, headerText, bodyText, footerText, buttonText, sections } = req.body;

  if (!to || !headerText || !bodyText || !footerText || !buttonText || !sections || sections.length === 0) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const data = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "list",
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
        button: buttonText,
        sections: sections
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

export default router;