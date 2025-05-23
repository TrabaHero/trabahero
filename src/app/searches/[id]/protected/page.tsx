"use client";

import { Button } from "@/components/form/button";
import { ResumeTable } from "@/components/table";
import { Title } from "@/components/ui/branding";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

async function getData(
  search: string,
  page: number,
  count: number
): Promise<any> {
  let onResolve: Function;
  const data = new Promise((res) => (onResolve = res));

  setTimeout(async () => {
    const response = await fetch(
      `/api/v0/searches/connections?search=${search}&page=${page}&count=${count}`
    );
    const { connections } = await response.json();
    onResolve(connections);
  }, 2500);

  await fetch(
    `/api/v0/searches/candidates?search=${search}&page=${page}&count=${count}`
  );
  return await data;
}

export default function Page() {
  const urlParams = useParams();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [disableSubmit, setDisableSubmit] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [intervalId, setIntervalId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [fields, setFields] = useState<{ key: string; value: string }[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const id = urlParams.id?.toString();
  if (!id) router.push("/404");

  async function get() {
    const data = await getData(id as string, page, count);
    setData(data);
    setTotalCount(data.length);
    setFirstLoadDone(true);

    const searchDetails = await fetch(
      `/api/v0/searches/get_fields/${id}`
    ).then((r) => r.json());
    const normalizedFields = (searchDetails.fields || []).map((field: any) =>
      typeof field === "object" ? field : { key: "", value: field }
    );
    setFields(normalizedFields);
  }

  useEffect(() => {
    //intervalId && clearInterval(intervalId)
    //const interval = setInterval(get, 5000)
    //setIntervalId(interval as unknown as number)
    get();
  }, [page, count, selected]);

  const handleContactSubmission = async () => {
    setDisableSubmit(true);
    await fetch("/api/v0/searches/candidate-interview-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search: id, candidates: selected }),
    });
    setDisableSubmit(false);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (dialogRef.current?.open && !dialogOpen) dialogRef.current?.close();
    else if (!dialogRef.current?.open && dialogOpen)
      dialogRef.current?.showModal();
  }, [dialogOpen]);

  const handleAddQualification = async () => {
    if (!newKey.trim() || !newValue.trim() || !id) return;

    // Prepare the new qualification to be added
    const updatedField = { key: newKey.trim(), value: newValue.trim() };

    console.log("Adding qualification:", updatedField); // Log the field being added

    // Update the UI to reflect the changes locally
    setFields((prevFields) => {
      const updatedFields = [...prevFields, updatedField];
      console.log("Updated fields after adding:", updatedFields); // Log the updated fields
      return updatedFields;
    });

    // Clear the input fields
    setNewKey("");
    setNewValue("");
  };

  const handleRemoveQualification = (index: number) => {
    const removedField = fields[index]; // Get the field to be removed
    console.log("Removing qualification:", removedField); // Log the field being removed

    setFields((prevFields) => {
      const updatedFields = prevFields.filter((_, i) => i !== index); // Remove the field
      console.log("Updated fields after removal:", updatedFields); // Log the updated fields
      return updatedFields;
    });
  };

  // Handle saving the fields to the database
  const handleSave = async () => {
    if (!id) return;

    console.log("Saving fields:", fields);

    // Send the updated fields to the backend
    await fetch(`/api/v0/searches/update_fields/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields, // Send the current fields
      }),
    });

    setModalOpen(false); // Close the modal after saving

    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-[#1A1A1A] text-white flex flex-col items-center justify-center p-2 sm:p-4">
      <Title />

      {data ? (
        <>
          <div className="flex justify-center sm:justify-end mb-4 w-full max-w-5xl px-2">
            <Button className="bg-primary w-full sm:w-auto" onClick={() => setModalOpen(true)}>
              Edit Qualifications
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row w-full max-w-5xl px-2 mb-4">
            <Button className="bg-primary w-full sm:w-32 sm:ml-auto" onClick={get}>Refresh</Button>
          </div>
          

          <div className="w-full w-7xl max-w-screen mx-auto px-2 md:px-4 lg:px-8">
            <ResumeTable
              data={data}
              id={id as string}
              selected={selected}
              page={page}
              maxPage={Math.ceil(totalCount / count)}
              firstLoadDone={firstLoadDone}
              count={count}
              setPage={setPage}
              setCount={setCount}
              removeSelected={(id) =>
                setSelected((s) => s.filter((i) => i !== id))
              }
              addSelected={(id) =>
                setSelected((s) => {
                  if (!s.includes(id)) {
                    return [...s, id];
                  }
                  return s;
                })
              }
              handleSubmit={handleContactSubmission}
              disableSubmit={disableSubmit}
            />
          </div>
        </>
      ) : (
        "Loading..."
      )}

      {/* Qualifications Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white text-black rounded-xl p-4 sm:p-6 w-full max-w-[90%] sm:max-w-[420px] max-h-[90vh] overflow-y-auto shadow-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              Edit Qualifications
            </h2>
            <hr className="mb-3 sm:mb-4" />

            <div className="max-h-[40vh] sm:max-h-none overflow-y-auto pb-2">
              {fields.map((field, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={field.key}
                    readOnly
                    className="w-1/2 p-2 rounded border text-sm bg-gray-100"
                  />
                  <input
                    type="text"
                    value={field.value}
                    readOnly
                    className="w-1/2 p-2 rounded border text-sm bg-gray-100"
                  />
                  <button
                    onClick={() => handleRemoveQualification(index)}
                    className="text-red-600 hover:text-red-800"
                    title="Remove"
                  >
                    ⊖
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                className="w-1/2 p-2 rounded border text-sm"
                placeholder="Qualification title"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <input
                type="text"
                className="w-1/2 p-2 rounded border text-sm"
                placeholder="Qualification value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleAddQualification}
                className="w-full border border-red-500 text-red-500 py-2 rounded hover:bg-red-50"
              >
                Add Qualification
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                Save
              </button>

              <button
                onClick={() => setModalOpen(false)}
                className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <dialog ref={dialogRef} className="p-4 sm:p-8 rounded-lg max-w-[90%] w-[400px] max-h-[80vh] sm:max-h-[400px]">
        <div className="flex flex-col h-full">
          <h1 className="font-bold text-xl sm:text-2xl mb-3 sm:mb-4">Thank you!</h1>
          <hr />
          <p className="my-3 sm:my-4">
            Thank you for using our service! We will contact you regarding the
            details of the agency with your preferred candidates.
          </p>
          <Button
            className="bg-primary mt-auto w-full"
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </Button>
        </div>
      </dialog>

      <div className="text-center text-sm text-gray-400 mt-4 px-4">
        Questions or concerns? Call us at:
        <br />
        <span className="font-medium text-white">09270251730</span>
      </div>
    </main>
  );
}
