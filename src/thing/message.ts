type BaseThing = {
  id: string;
  name: string;
  type: string;
  subtype: string;
};

type MessageThing = BaseThing & {
  content: string;
  origin: { id: string, name: string }[];
  destination: { id: string, name: string }[];
};

type SourceThing = BaseThing & {
  user: string;
  collection: string;
}
