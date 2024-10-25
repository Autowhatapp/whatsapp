import { Router, Request, Response } from "express";

import multer from "multer";
import FormData from "form-data";

import { axiosInstance } from "../config/axios";
import { errorHandler } from "../middleware/errorHandler";
import axios from "axios";

const router = Router();
const upload = multer();

interface FlowRequest extends Request {
  file?: Express.Multer.File;
}

interface Component {
  type: string;
  label?: string;
  name?: string;
  text?: string;
  options?: string[];
  required?: boolean;
}

interface Screen {
  id: string;
  title: string;
  components: Component[];
}

interface Schema {
  screens: Screen[];
}

const generateFlowJSON = (schema: Schema) => {
  const screens: any[] = [];
  const routingModel: { [key: string]: string[] } = {};

  if (schema.screens.length > 8) {
    throw new Error("Maximum number of screens (8) exceeded.");
  }

  const truncateLabel = (label: string | undefined): string | undefined => {
    if (label && label.length > 20) {
      console.warn(`Warning: Label "${label}" truncated to 20 characters.`);
      return label.substring(0, 20);
    }
    return label;
  };

  const createComponent = (
    component: Component,
    index: number,
    screenId: string
  ): any => {
    // if (
    //   !component.name &&
    //   !["text", "heading", "subheading", "caption"].includes(component.type)
    // ) {
    //   throw new Error(`Component missing name: ${JSON.stringify(component)}`);
    // }

    const uniqueName = component.name
      ? `${screenId}_${component.name.replace(/\s+/g, "_")}_${index}`
      : `unnamed_${index}`;

    // console.log(component);

    switch (component.type) {
      case "text":
        return { type: "TextBody", text: component.text };
      case "TextBody":
        return { type: "TextBody", text: component.text };
      case "heading":
        return { type: "TextHeading", text: component.text };
      case "TextHeading":
        return { type: "TextHeading", text: component.text };
      case "subheading":
        return { type: "TextSubheading", text: component.text };
      case "TextSubheading":
        return { type: "TextSubheading", text: component.text };
      case "caption":
        return { type: "TextCaption", text: component.text };
      case "TextCaption":
        return { type: "TextCaption", text: component.text };
      case "radio":
        return {
          type: "RadioButtonsGroup",
          label: truncateLabel(component.label),
          name: uniqueName,
          "data-source": component.options?.map((option, i) => ({
            id: `${i}_${option.replace(/\s+/g, "_").toLowerCase()}`,
            title: option,
          })),
          required: component.required || false,
        };
      case "radio_buttons":
        return {
          type: "RadioButtonsGroup",
          label: truncateLabel(component.label),
          name: uniqueName,
          "data-source": component.options?.map((option, i) => ({
            id: `${i}_${option.replace(/\s+/g, "_").toLowerCase()}`,
            title: option,
          })),
          required: component.required || false,
        };
      case "textarea":
        return {
          type: "TextArea",
          label: truncateLabel(component.label),
          name: uniqueName,
          required: component.required || false,
        };
      case "input":
        return {
          type: "TextInput",
          label: truncateLabel(component.label),
          name: uniqueName,
          required: component.required || false,
          "input-type": "text",
        };
      case "text_entry":
        return {
          type: "TextInput",
          label: truncateLabel(component.label),
          name: uniqueName,
          required: component.required || false,
          "input-type": "text",
        };
      case "date":
        return {
          type: "DatePicker",
          label: truncateLabel(component.label),
          name: uniqueName,
          required: component.required || false,
        };
      case "date_picker":
        return {
          type: "DatePicker",
          label: truncateLabel(component.label),
          name: uniqueName,
          required: component.required || false,
        };
      case "dropdown":
        return {
          type: "Dropdown",
          label: truncateLabel(component.label),
          name: uniqueName,
          "data-source": component.options?.map((option, i) => ({
            id: `${i}_${option.replace(/\s+/g, "_").toLowerCase()}`,
            title: option,
          })),
          required: component.required || false,
        };
      case "photo_picker":
        return {
          name: uniqueName,
          label: truncateLabel(component.label),
          "photo-source": component.source,
          "max-uploaded-photos": component.uploads,
        };
      case "checkbox":
        return {
          type: "CheckboxGroup",
          label: truncateLabel(component.label),
          name: uniqueName,
          "data-source": component.options?.map((option, i) => ({
            id: `${i}_${option.replace(/\s+/g, "_").toLowerCase()}`,
            title: option,
          })),
          required: component.required || false,
        };
    }
  };

  const collectPreviousData = (
    currentIndex: number,
    forDataField = false
  ): { [key: string]: any } => {
    return schema.screens
      .slice(0, currentIndex)
      .flatMap((screen) =>
        screen.components.map((component, i) => {
          if (component.name) {
            const key = `${screen.id}_${component.name.replace(
              /\s+/g,
              "_"
            )}_${i}`;
            let value: any; // Use 'any' to allow assignment, but refine this type if possible
            if (forDataField) {
              if (component.type === "checkbox") {
                value = {
                  type: "array",
                  items: { type: "string" },
                  __example__: [],
                };
              } else {
                value = { type: "string", __example__: "Example" };
              }
            } else {
              value = `\${data.${key}}`;
            }
            return [key, value] as [string, any]; // Explicitly define the tuple type
          }
          return [];
        })
      )
      .reduce((acc: { [key: string]: any }, [key, value]) => {
        if (key) {
          acc[key] = value;
        }
        return acc;
      }, {} as { [key: string]: any }); // Explicitly define the type for acc
  };

  const createScreen = (
    screenData: Screen,
    index: number,
    totalScreens: number
  ): any => {
    const isTerminal = index === totalScreens - 1;

    // if (screenData.components.length > 8) {
    //   throw new Error(
    //     `Screen ${screenData.id} exceeds maximum number of components (8).`
    //   );
    // }

    const screenComponents = screenData.components
      .map((comp, i) => createComponent(comp, i, screenData.id))
      .filter((component) => component !== null);

    const componentNames = screenData.components
      .map((component, i) =>
        component.name
          ? `${screenData.id}_${component.name.replace(/\s+/g, "_")}_${i}`
          : null
      )
      .filter((name): name is string => name !== null);

    const screenPayload = componentNames.reduce(
      (acc: { [key: string]: string }, name) => {
        acc[name] = `\${form.${name}}`;
        return acc;
      },
      {}
    );

    const screen = {
      id: screenData.id,
      title: screenData.title,
      data: collectPreviousData(index, true),
      terminal: isTerminal,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "flow_path",
            children: [
              ...screenComponents,
              {
                type: "Footer",
                label: isTerminal ? "Done" : "Continue",
                "on-click-action": isTerminal
                  ? {
                      name: "complete",
                      payload: {
                        ...collectPreviousData(totalScreens),
                        ...screenPayload,
                      },
                    }
                  : {
                      name: "navigate",
                      next: {
                        type: "screen",
                        name: schema.screens[index + 1].id,
                      },
                      payload: {
                        ...collectPreviousData(index + 1),
                        ...screenPayload,
                      },
                    },
              },
            ],
          },
        ],
      },
    };

    if (!isTerminal) {
      routingModel[screenData.id] = [schema.screens[index + 1].id];
    }

    return screen;
  };

  schema.screens.forEach((screenData, index) => {
    const screen = createScreen(screenData, index, schema.screens.length);
    if (screen) {
      screens.push(screen);
    }
  });

  if (screens.length !== schema.screens.length) {
    throw new Error("Some screens were invalid. Flow JSON not generated.");
  }

  return {
    version: "3.1",
    data_api_version: "3.0",
    routing_model: routingModel,
    screens: screens,
  };
};

router.post("/generatejson", async (req: Request, res: Response) => {
  try {
    const schema: Schema = req.body;
    const flowJSON = generateFlowJSON(schema);
    res.json(flowJSON);
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
});

router.post(
  "/createflow",
  upload.none(),
  async (req: Request, res: Response) => {
    const data = new FormData();
    data.append("name", req.body.name || "<sss>");

    // Ensure categories are sent as a proper JSON array
    const categories = req.body.categories;
    if (categories && Array.isArray(categories)) {
      data.append("categories", JSON.stringify(categories));
    } else {
      data.append("categories", JSON.stringify(["OTHER"]));
    }

    try {
      const response = await axiosInstance.post("183589558166774/flows", data, {
        headers: {
          ...data.getHeaders(),
        },
      });
      res.json(response.data);
    } catch (error) {
      errorHandler(error, res);
    }
  }
);

router.get("/getflowlist", async (req: Request, res: Response) => {
  try {
    const response = await axiosInstance.get("183589558166774/flows");
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.get("/getflowid/:flowId", async (req: Request, res: Response) => {
  const { flowId } = req.params;

  try {
    const response = await axiosInstance.get(`${flowId}`, {
      params: {
        fields:
          "id,name,categories,preview,status,validation_errors,json_version,data_api_version,data_channel_uri,whatsapp_business_account,application",
      },
    });
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.get("/getflowpreview/:flowId", async (req: Request, res: Response) => {
  const { flowId } = req.params;

  try {
    const response = await axiosInstance.get(`${flowId}`, {
      params: {
        fields: "preview",
      },
    });
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post(
  "/updateflow/:flowId",
  upload.single("file"),
  async (req: FlowRequest, res: Response) => {
    const { flowId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const data = new FormData();
    data.append("file", file.buffer, { filename: "flow.json" });
    data.append("name", "flow.json");
    data.append("asset_type", "FLOW_JSON");

    try {
      const response = await axiosInstance.post(`${flowId}/assets`, data, {
        headers: {
          ...data.getHeaders(),
        },
      });
      res.json(response.data);
    } catch (error) {
      errorHandler(error, res);
    }
  }
);

router.delete("/deleteflow/:flowId", async (req: Request, res: Response) => {
  const { flowId } = req.params;

  try {
    const response = await axiosInstance.delete(`${flowId}`);
    res.json(response.data);
  } catch (error) {
    errorHandler(error, res);
  }
});

router.post("/builder", async (req, res) => {
  try {
    const data = req.body.data;

    if (!data) {
      return res.status(400).json({ error: "No data provided" });
    }

    // console.log(data);

    const type = data.type;

    if (type === "create_form") {
      const flowType = data.flowType;

      // console.log(data);

      if (flowType === "manual_flow") {
        const response = await axios.post(
          "http://localhost:3002/api/flows/create-flow",
          {
            name: data.form_name,
            botName: data.form_name,
            formVisibility: data.form_visibility,
            submissionType: data.submission_type,
            formAssignment: data.form_assignment,
            workspaceId: data.workspaceId,
            userId: data.userId,
          }
        );

        // console.log(response.data);

        if (response.status === 200) {
          return res.json({
            status: "success",
            data: {
              screen: "Flow_Screens",
              data: {
                botId: response.data.data.botId,
                screens: [{ id: "create_screen", title: "Create Screen" }],
              },
            },
          });
        } else {
          return res.json({
            status: "success",
            data: {
              screen: "Form_Builder",
              data: {
                message: "Failed to Create Form",
              },
            },
          });
        }
      } else if (flowType === "ai_flow") {
        try {
          const response = await axios.post(
            "http://localhost:3002/api/flows/create-ai-flow",
            {
              description: data.ai_flow_description,
              workspaceId: data.workspaceId,
              userId: data.userId,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          return res.json({
            status: "Flow_Screens",
            data: {
              screen: "Flow_Screens",
              data: {
                screens: [{ id: "create_screen", title: "Create Screen" }],
              },
            },
          });

          console.log(response.data);

          if (response.data) {
            const screens = response.data.json;
          }

          // return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error(
              "Axios error in sendOrchestrateMessage:",
              error.message
            );
            console.error("Response data:", error.response?.data);
            console.error("Response status:", error.response?.status);
            throw new Error(
              `Failed to send orchestrate message: ${error.message}`
            );
          } else {
            console.error("Unexpected error in sendOrchestrateMessage:", error);
            throw new Error(
              "An unexpected error occurred while sending the orchestrate message"
            );
          }
        }
      }
    } else if (type === "add_component") {
      let componentType = data.component;
      let component;
      let botComponent;

      if (componentType === "basic_text") {
        component = createHeadingComponent(
          data.text_type_dropdown,
          data.basic_text_body
        );
        botComponent = {
          fieldType: data.text_type_dropdown,
          fieldId: "",
          fieldText: data.basic_text_body
        } 
      } else if (componentType === "text-entry") {
        component = createTextEntryComponent(
          data.text_entry_type,
          data.text_entry_field_name
        );
        botComponent = {
          fieldType: "text-entry",
          fieldId: data.text_entry_field_name,
          fieldLabel: data.text_entry_field_name,
          fieldName: data.text_entry_field_name
        }
      } else if (componentType === "checkbox") {
        component = createCheckboxComponent(
          data.componentType,
          data.checkbox_options,
          data.checkbox_field_name
        );
        botComponent = {
          fieldType: "checkbox",
          fieldId: data.checkbox_field_name,
          fieldLabel: data.checkbox_field_name,
          fieldName: data.checkbox_field_name,
          fieldOptions: data.checkbox_field_options.split(",")
        }
      } else if (componentType === "radio-buttons") {
        component = createRadioButtonsComponent(
          data.componentType,
          data.radio_button_options,
          data.radio_buttons_field_name
        );
        botComponent = {
          fieldType: "radio-buttons",
          fieldId: data.radio_buttons_field_name,
          fieldLabel: data.radio_buttons_field_name,
          fieldName: data.radio_buttons_field_name,
          fieldOptions: data.radio_button_options.split(",")
        }
      } else if (componentType === "dropdown") {
        component = createDropdownComponent(
          data.componentType,
          data.drop_down_options,
          data.dropdown_field_name
        );
        botComponent = {
          fieldType: "dropdown",
          fieldId: data.dropdown_field_name,
          fieldLabel: data.dropdown_field_name,
          fieldName: data.dropdown_field_name,
          fieldOptions: data.drop_down_options.split(",")
        }
      } else if (componentType === "date-picker") {
        component = createDatePickerComponent(
          data.componentType,
          data.date_picker_start_date,
          data.date_picker_end_date,
          data.date_picker_field_name
        );
        botComponent = {
          fieldType: "date-picker",
          fieldId: data.date_picker_field_name,
          fieldLabel: data.date_picker_field_name,
          fieldName: data.date_picker_field_name
        }
      } else if (componentType === "image-upload") {
        component = createPhotoPickerComponent(
          data.componentType,
          data.photo_picker_max_uploads,
          data.photo_source,
          data.photo_picker_field_description,
          data.photo_picker_field_name
        );
        botComponent = {
          fieldType: "image-upload",
          fieldId: data.photo_picker_field_name,
          fieldLabel: data.photo_picker_field_name,
          fieldName: data.photo_picker_field_name
        }
      } else if (componentType === "document-picker") {
        component = createDocumentPickerComponent(
          data.componentType,
          data.document_picker_max_uploads,
          data.document_picker_field_description,
          data.document_picker_field_name
        );
        botComponent = {
          fieldType: "document-picker",
          fieldId: data.document_picker_field_name,
          fieldLabel: data.document_picker_field_name,
          fieldName: data.document_picker_field_name
        }
      }

      // console.log(component)

      let resp = await axios.get(
        `http://localhost:8500/api/bots/${data.botId}`
      );

      if (resp.status !== 200) {
        return res.json({
          status: "failed",
          data: { screen: "Error", data: { message: "No bot found" } },
        });
      }

      const bot = resp.data;

      // console.log(bot)

      let screen = bot.screens;

      let botScreen = bot.screens;

      console.log({ screen }, "before");
      console.log({ botScreen }, "before");

      if (Array.isArray(screen)) {
        if (screen.length === 0) {
          screen = [
            {
              id: data.screen_name,
              title: data.screen_name,
              components: [component],
            },
          ];
          botScreen = [
            {
              id: data.screen_name,
              title: data.screen_name,
              components: [botComponent],
            },
          ];
        } else {
          const currentScreen = screen.findIndex(
            (screen: any) => screen.id === data.screen_name
          );

          if (currentScreen === -1) {
            screen = [
              ...bot.screens,
              {
                id: data.screen_name,
                title: data.screen_name,
                components: [component],
              },
            ];
            botScreen = [
              ...bot.screens,
              {
                id: data.screen_name,
                title: data.screen_name,
                components: [botComponent],
              },
            ]
          } else {
            (screen[currentScreen] as any).components?.push(component);
            (botScreen[currentScreen] as any).components?.push(botComponent);
          }
        }
      } else {
        screen = [
          {
            id: data.screen_name,
            title: data.screen_name,
            components: [component],
          },
        ];
        botScreen = [
          {
            id: data.screen_name,
            title: data.screen_name,
            components: [botComponent],
          },
        ];
      }

      console.log({ screen }, "after");
      console.log({ botScreen }, "after");

      // const screenJson = await axios.post(
      //   "http://localhost:8500/api/flows/generatejson",
      //   { screens: screen }
      // );

      // console.log(screenJson.data.screens[0].layout)

      // console.log(screenJson.status);

      // if (screenJson.status === 200) {
      // console.log(screenJson.data.screens[0].layout.children);
      resp = await axios.put(
        `http://localhost:3002/api/flows/from-bot-update-flow/${bot.flowId}`,
        {
          json: { screens: screen },
          botScreen: botScreen,
          botId: bot._id.toString(),
        }
      );

      // console.log(resp.data);

      if (resp.status !== 200) {
        return res.json({
          status: "failed",
          data: { screen: "Error", data: { message: "unexpected error" } },
        });
      }

      const screenData = {
        screen: "Flow_Screens",
        data: {
          screens: [
            { id: "create_screen", title: "Create Screen" },
            ...(screen?.map((screen: any) => ({
              id: screen.id,
              title: screen.title,
            })) ?? []),
          ],
        },
      };

      // console.log(screenData);

      res.json({
        status: "success",
        data: screenData,
      });
      // }
    }
  } catch (err: any) {
    console.log(err.message);
  }
});

function createHeadingComponent(component: string, text: string) {
  return {
    type: component,
    text: text,
    visible: true,
  };
}

function createTextEntryComponent(component: string, fieldName: string) {
  return {
    type: "TextInput",
    required: true,
    label: fieldName,
    "input-type": component,
    name: fieldName,
  };
}

function createCheckboxComponent(
  component: string,
  options: string,
  fieldName: string
) {
  return {
    type: "CheckboxGroup",
    name: fieldName,
    label: fieldName,
    options: options.split(","),
  };
}

function createDropdownComponent(
  component: string,
  options: string,
  fieldName: string
) {
  return {
    type: "Dropdown",
    name: fieldName,
    label: fieldName,
    "data-source": createComponentOptions(options),
  };
}

function createRadioButtonsComponent(
  component: string,
  options: string,
  fieldName: string
) {
  return {
    type: "RadioButtonsGroup",
    name: fieldName,
    label: fieldName,
    "data-source": createComponentOptions(options),
  };
}

function createDatePickerComponent(
  component: string,
  startDate: string,
  endDate: string,
  fieldName: string
) {
  return {
    type: "DatePicker",
    name: fieldName,
    label: fieldName,
    "min-date": startDate,
    "max-date": endDate,
    "unavailable-dates": ["1694779200000", "1697371200000"],
  };
}

function createPhotoPickerComponent(
  component: string,
  maxUploads: number,
  source: string,
  description: string,
  fieldName: string
) {
  return {
    type: "PhotoPicker",
    name: fieldName,
    label: fieldName,
    description: description,
    "photo-source": source,
    "min-uploaded-photos": 1,
    "max-uploaded-photos": maxUploads,
    "max-file-size-kb": 10240,
  };
}

function createDocumentPickerComponent(
  component: string,
  maxUploads: number,
  description: string,
  fieldName: string
) {
  return {
    type: "DocumentPicker",
    name: fieldName,
    label: fieldName,
    description: description,
    "min-uploaded-photos": 1,
    "max-uploaded-photos": maxUploads,
    "max-file-size-kb": 10240,
  };
}

function createComponentOptions(options: string) {
  return options.split(",").map((option) => ({
    id: option.trim(),
    title: option.trim(),
  }));
}

export default router;

// [
//   1415857526459861,1918637725214888, 453340110600903,2593664771022869,1279070726695588,508493435515294,1099598898449662,407350889096568,573772938326958,2941047546034002,1661176884740031,1460861564605630,2036576033447193,529191233078297,923610806331582,524012130508638,882798286898876,3758040291117070,3697408800570752,1853779815150792,1964950780615566,520062457595847,2257555771288555,1111721180523072,587344763804778,964365582378734,8420829714669090,1812204859311034,1057481255857772,568877518987542,1518158715481425,1085723516558534,924521359539025,1099414514910637,1644526466477714,1708906893004044,907769074105536,2054702771653338,1584305672462389,561486883001842,1237182004069512,1509141629969657,1074908111003887,1062230272244109,534384412791140,520493154094659,9223370574356978,522578900702772,559560933285910,1107975174082427,568673895845302,942128434607731,1289710668873004,8422968531132355,1483422745665403,881652404072432,1089446842779696,3485344031595770,1556892431584881,1081686326865479,1587017925233142,1989769504827757,1055985562734358,2918540838309639,1727033174784483,1494921194544834,1072860917565890,1197790088185032,533428622975983,
// ].forEach((id) => {
//   axios
//     .delete(`https://graph.facebook.com/${id}`, {
//       headers: {
//         Authorization:
//           "Bearer EAAWiZA056phcBO15xVaFdZAnje0UmZBPOkHVgcThrSXnx8OqCXWxwEeuErxJzzZBbYxb3QFJpXOScHoB0PFKEEdzZAXPC7oNLtbAbw8D4Q2MeF0u1zPVKt3zERUd6f6MXeUMYm8yIXdJGPDZBYxWdmfMQ0ZAa2s8rkWlABEQ3P3UII5ZB9s3QpAjtVN7ZAJzBtbRNFAZDZD",
//       },
//     })
//     .then((res) => console.log(res.data))
//     .catch((err) => console.log(err.response.data));
// });
