import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, deleteEmployee } from '../api';
import { UserPlus, Trash2, ShieldCheck, Mail } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';

const Employees = () => {
const [employees, setEmployees] = useState([]);
const [loading, setLoading] = useState(true);
const [showAddModal, setShowAddModal] = useState(false);
const [formData, setFormData] = useState({ name: '', phone: '' });
const [modal, setModal] = useState({ open: false, title: '', message: '', type: 'success' });
const [confirm, setConfirm] = useState({ open: false, id: null });

const [total, setTotal] = useState(0);
const [page, setPage] = useState(0);

useEffect(() => {
fetchEmployees();
}, [page]);

const fetchEmployees = async () => {
try {
const resp = await getEmployees({
limit: 10,
offset: page * 10
});


  setEmployees(resp.data.data || []);
  setTotal(resp.data.total || 0);
} catch (err) {
  console.error(err);
} finally {
  setLoading(false);
}

};

const handleSubmit = async (e) => {
e.preventDefault();

try {
  await addEmployee(formData);

  setFormData({ name: '', phone: '' });
  setShowAddModal(false);

  setModal({
    open: true,
    title: 'Employee added',
    message: `${formData.name} can now use the WhatsApp bot to check in, file a day plan and request leave.`,
    type: 'success'
  });

  fetchEmployees();
} catch (err) {
  console.error(err);
  setModal({
    open: true,
    title: 'Could not add the employee',
    message: 'Nothing was saved. Check that the number starts with a country code and is not already in use, then try again.',
    type: 'error'
  });
}

};

const confirmDelete = async () => {
if (!confirm.id) return;

try {
  await deleteEmployee(confirm.id);

  fetchEmployees();

  setModal({
    open: true,
    title: 'Employee removed',
    message: 'They no longer have access to the bot. Their attendance and leave history stays on record.',
    type: 'success'
  });
} catch (err) {
  console.error(err);
  setModal({
    open: true,
    title: 'Could not remove the employee',
    message: 'Nothing was changed — they still have access. Please try again.',
    type: 'error'
  });
}

};

return ( <div className="flex flex-col">

  <Modal
    isOpen={modal.open}
    onClose={() => setModal({ ...modal, open: false })}
    title={modal.title}
    message={modal.message}
    type={modal.type}
  />

  <ConfirmModal
    isOpen={confirm.open}
    onClose={() => setConfirm({ open: false, id: null })}
    onConfirm={confirmDelete}
    title="Remove Team Member?"
    message="This action will permanently revoke their access to the ASKworX internal hub. This cannot be undone."
    confirmText="Remove employee"
  />


  {/* ================= HEADER ================= */}

  <div className="flex justify-between items-end mb-12 shrink-0">

    <div>

      <div className="flex items-center gap-3 mb-3">

        <div className="px-3 py-1 bg-primary-light rounded-full">

          <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
            Human Resources
          </span>

        </div>

      </div>


      <h1 className="text-4xl lg:text-5xl font-semibold text-text-primary tracking-tight leading-none">
        Team Roster
      </h1>

    </div>


    <button
      onClick={() => setShowAddModal(true)}
      className="
        bg-primary
        hover:bg-primary-hover
        text-white
        px-6
        py-3
        rounded-lg
        font-medium
        text-[10px]
        uppercase
        tracking-widest
        flex
        items-center
        gap-3
        transition-colors
        active:scale-95
      "
    >

      <UserPlus className="w-4 h-4" />

      Add Employee

    </button>

  </div>


  {/* ================= EMPLOYEE TABLE ================= */}

  <div className="flex-1 overflow-hidden bg-white shadow-card border border-border rounded-lg flex flex-col min-h-0">

    <div className="flex-1 overflow-auto">

      <table className="w-full text-left border-collapse min-w-[800px]">

        <thead className="sticky top-0 z-10">

          <tr className="text-text-secondary text-[10px] font-medium uppercase tracking-widest bg-background border-b border-border">

            <th className="px-10 py-6">
              Member Identity
            </th>

            <th className="px-10 py-6">
              Verification
            </th>

            <th className="px-10 py-6">
              Role
            </th>

            <th className="px-10 py-6 text-right">
              Actions
            </th>

          </tr>

        </thead>


        <tbody className="divide-y divide-border">

          {employees.map((emp) => (

            <tr
              key={emp.id}
              className="group hover:bg-background transition-colors"
            >

              {/* Member Identity */}

              <td className="px-10 py-8">

                <div className="flex items-center gap-4">

                  <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center text-primary font-semibold text-xs">

                    {emp.name.charAt(0).toUpperCase()}

                  </div>


                  <div className="flex flex-col">

                    <span className="font-semibold text-text-primary text-sm tracking-tight">

                      {emp.name}

                    </span>


                    <span className="text-[9px] font-medium text-success uppercase tracking-widest mt-1">

                      Verified Member

                    </span>

                  </div>

                </div>

              </td>


              {/* Verification */}

              <td className="px-10 py-8">

                <span className="text-xs font-medium text-text-secondary tracking-widest">

                  📞 {emp.phone}

                </span>

              </td>


              {/* Role */}

              <td className="px-10 py-8">

                <div className="flex items-center gap-2 px-3 py-1.5 bg-background text-text-secondary rounded-full border border-border w-fit">

                  <ShieldCheck className="w-3 h-3 text-primary" />

                  <span className="text-[9px] font-medium uppercase tracking-widest">

                    {emp.role}

                  </span>

                </div>

              </td>


              {/* Actions */}

              <td className="px-10 py-8 text-right">

                <button
                  onClick={() =>
                    setConfirm({
                      open: true,
                      id: emp.id
                    })
                  }
                  className="
                    p-3
                    text-text-secondary
                    hover:text-red-500
                    hover:bg-red-50
                    rounded-lg
                    transition-colors
                    active:scale-95
                  "
                >

                  <Trash2 className="w-4 h-4" />

                </button>

              </td>

            </tr>

          ))}


          {/* Empty State */}

          {employees.length === 0 && !loading && (

            <tr>

              <td
                colSpan="4"
                className="px-10 py-20 text-center"
              >

                <p className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">

                  No registered employees

                </p>

              </td>

            </tr>

          )}

        </tbody>

      </table>

    </div>


    {/* ================= PAGINATION ================= */}

    {total > 10 && (

      <div className="shrink-0 px-10 py-6 bg-background border-t border-border flex items-center justify-between">

        <span className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">

          Showing Page{' '}

          <span className="text-text-primary">
            {page + 1}
          </span>

          {' '}of{' '}

          {Math.ceil(total / 10)}

        </span>


        <div className="flex gap-5 items-center">

          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="
              text-[10px]
              font-medium
              uppercase
              tracking-widest
              text-text-secondary
              hover:text-primary
              disabled:opacity-30
              transition-colors
            "
          >

            Previous

          </button>


          <span className="w-px h-4 bg-border" />


          <button
            disabled={(page + 1) * 10 >= total}
            onClick={() => setPage(page + 1)}
            className="
              text-[10px]
              font-medium
              uppercase
              tracking-widest
              text-text-secondary
              hover:text-primary
              disabled:opacity-30
              transition-colors
            "
          >

            Next

          </button>

        </div>

      </div>

    )}

  </div>


  {/* ================= ADD EMPLOYEE MODAL ================= */}

  {showAddModal && (

    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in">

      <div className="bg-white border border-border w-full max-w-md rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">

        <div className="p-8">

          <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-6">

            <UserPlus className="w-6 h-6 text-primary" />

          </div>


          <h2 className="text-2xl font-semibold text-text-primary tracking-tight mb-2">

            New Member

          </h2>


          <p className="text-text-secondary text-sm font-normal mb-8">

            Onboard a new employee to the ASKworX internal system.

          </p>


          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            <div>

              <label className="text-[10px] font-medium uppercase tracking-widest text-text-secondary block mb-2">

                Full Name

              </label>


              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value
                  })
                }
                className="
                  w-full
                  bg-white
                  border
                  border-border
                  rounded-lg
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-text-primary
                  focus:border-primary
                  focus:outline-none
                  transition-colors
                "
                placeholder="Enter name..."
              />

            </div>


            <div>

              <label className="text-[10px] font-medium uppercase tracking-widest text-text-secondary block mb-2">

                WhatsApp Number (Digits only)

              </label>


              <input
                required
                type="text"
                pattern="[0-9]+"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value.replace(
                      /[^0-9]/g,
                      ''
                    )
                  })
                }
                className="
                  w-full
                  bg-white
                  border
                  border-border
                  rounded-lg
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-text-primary
                  focus:border-primary
                  focus:outline-none
                  transition-colors
                "
                placeholder="e.g. 918310029635"
              />

            </div>


            <div className="flex gap-4 pt-3">

              <button
                type="button"
                onClick={() =>
                  setShowAddModal(false)
                }
                className="
                  flex-1
                  px-6
                  py-3
                  bg-background
                  border
                  border-border
                  text-text-secondary
                  rounded-lg
                  font-medium
                  text-[10px]
                  uppercase
                  tracking-widest
                  hover:bg-border
                  transition-colors
                "
              >

                Cancel

              </button>


              <button
                type="submit"
                className="
                  flex-1
                  px-6
                  py-3
                  bg-primary
                  hover:bg-primary-hover
                  text-white
                  rounded-lg
                  font-medium
                  text-[10px]
                  uppercase
                  tracking-widest
                  transition-colors
                  active:scale-95
                "
              >

                Register Team Member

              </button>

            </div>

          </form>

        </div>

      </div>

    </div>

  )}

</div>

);
};

export default Employees;
